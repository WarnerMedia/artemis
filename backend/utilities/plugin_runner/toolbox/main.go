package main

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"os/exec"
	"os/signal"
	"sync"

	"github.com/fatih/color"
	"golang.org/x/sys/unix"
)

// Root directory of the plugin sources (mounted from engine container).
const pluginRoot = "/srv/engine/plugins"

// Root directory of the arg files (generated by the plugin runner script).
const argRoot = "/opt/artemis-run-plugin"

// PluginOutput is the captured output from the plugin execution.
type PluginOutput struct {
	Output   []byte // Raw stdout from plugin.
	ExitCode int

	LintErrors []error
}

func NewPluginOutput(output []byte, exitCode int) *PluginOutput {
	return &PluginOutput{
		Output:   output,
		ExitCode: exitCode,

		LintErrors: lint(output),
	}
}

// usage prints the command-line help and exits.
func usage() {
	fmt.Fprintf(os.Stderr, "Usage: "+
		os.Args[0]+" plugin runner\n")
	os.Exit(1)
}

// mustRenderCmd generates the command and args.
// Aborts on error.
func mustRenderCmd(plugin, runner string) (name string, args []string) {
	switch runner {
	case "core":
		name = "python" // Use system python from PATH.
		args = []string{pluginRoot + "/" + plugin + "/main.py"}
	case "boxed":
		name = pluginRoot + "/plugin.sh"
		args = []string{"--quiet", "--", plugin}
	default:
		log.Fatal("Unsupported plugin runner: " + runner)
	}

	// Append the contents of the arg files.
	for _, filename := range []string{"engine-vars.json", "images.json", "config.json"} {
		path := argRoot + "/" + filename
		buf, err := os.ReadFile(path)
		if err != nil {
			log.Fatalf("Unable to read arg file %s: %v", path, err)
		}
		args = append(args, string(buf))
	}

	return
}

// run executes the plugin.
// stdout and stderr from the plugin are colorized.
// Returns the exitcode.
func run(ctx context.Context, name string, args []string) (*PluginOutput, error) {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Stdin = nil
	outPipe, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to open stdout pipe: %w", err)
	}
	errPipe, err := cmd.StderrPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to open stderr pipe: %w", err)
	}

	if err = cmd.Start(); err != nil {
		return nil, fmt.Errorf("failed to execute plugin: %w", err)
	}

	// Capture lines from stdout and stderr and colorize them.
	// Since we colorize the lines, we use a channel to make sure the
	// lines are written sequentially and not on top of each other.
	// Initial capacity of the output buffer is anticipating a large
	// result.
	output := make([]byte, 0, 2*1024*1024)
	outchan := make(chan string)
	var wg sync.WaitGroup
	wg.Add(2)
	onFinish := func(err error) {
		if err != nil {
			errStr := err.Error()
			if errors.Is(err, bufio.ErrTooLong) {
				errStr = fmt.Sprintf("Output line exceeds maximum (%d bytes)",
					maxLineBufSize)
			}
			outchan <- color.HiYellowString(errStr)
		}
		wg.Done()
	}
	go scanPipe(outPipe, func(buf []byte) {
		output = append(output, buf...) // Capture JSON for processing.
		outchan <- string(buf)
	}, onFinish)
	go scanPipe(errPipe, func(buf []byte) {
		outchan <- color.RedString(string(buf))
	}, onFinish)
	go func() {
		wg.Wait()
		close(outchan)
	}()
	for line := range outchan {
		fmt.Println(line)
	}

	if cmdErr := cmd.Wait(); cmdErr != nil {
		exitcode := cmd.ProcessState.ExitCode()

		var exitErr *exec.ExitError
		if errors.As(cmdErr, &exitErr) && exitcode != -1 {
			// Normal process exit (with potential non-zero exit code).
			return NewPluginOutput(output, exitcode), nil
		} else {
			// Other error (e.g. IO interrupt, terminated by signal).
			return nil, cmdErr
		}
	}
	return NewPluginOutput(output, cmd.ProcessState.ExitCode()), nil
}

// installTerminateHandler sets up the handlers for termination signals
// such as Ctrl-C.
func installTerminateHandler(ctx context.Context) context.Context {
	retv, cancelFn := context.WithCancel(ctx)
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, unix.SIGTERM, unix.SIGINT, unix.SIGHUP, unix.SIGQUIT)
	go func() {
		s := <-sigChan
		log.Printf("Aborting: %v", s)
		// The plugin process, if running, will be killed.
		cancelFn()
	}()

	return retv
}

func reportStatus(exitCode int) {
	fmt.Print(color.HiCyanString(
		fmt.Sprintf("==> Plugin exited with status: %d ", exitCode)))
	if exitCode == 0 {
		color.HiGreen("(success)")
	} else {
		color.HiRed("(failed)")
	}
}

func reportLintErrors(errs []error) {
	for _, err := range errs {
		fmt.Print(color.HiRedString("--> Error: "))
		color.HiYellow(err.Error())
	}
}

func main() {
	if len(os.Args) < 3 {
		usage()
	}
	plugin := os.Args[1]
	runner := os.Args[2]

	ctx := installTerminateHandler(context.Background())

	name, args := mustRenderCmd(plugin, runner)
	output, err := run(ctx, name, args)
	if err != nil {
		log.Fatalf("Error running plugin: %v", err)
	}

	reportStatus(output.ExitCode)
	reportLintErrors(output.LintErrors)
}

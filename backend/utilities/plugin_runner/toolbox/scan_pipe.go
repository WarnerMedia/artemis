package main

import (
	"bufio"
	"io"
)

// Initial size of the line buffer, in bytes.
const initLineBufSize = 64 * 1024

// Maximum size of the line buffer, in bytes.
const maxLineBufSize = 128 * 1024 * 1024

// scanPipe reads lines from a pipe and passes it to the callback.
//
// The onLine callback receives the line buffer directly; since this
// buffer is re-used, the callback must copy it if it needs to be saved.
// The onFinish callback receives the error, if any, before the pipe is
// closed.
func scanPipe(in io.ReadCloser, onLine func([]byte), onFinish func(error)) {
	scanner := bufio.NewScanner(in)
	scanner.Buffer(make([]byte, 0, initLineBufSize), maxLineBufSize)

	for scanner.Scan() {
		onLine(scanner.Bytes())
	}

	err := scanner.Err()
	onFinish(err)
	if err != nil {
		// Force-close the pipe to avoid deadlock.
		in.Close()
	}
}

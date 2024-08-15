#!/usr/bin/env python3

import argparse

import boto3

# Custom Datadog installation: https://docs.datadoghq.com/serverless/aws_lambda/installation/python/?tab=custom
DATADOG_LAYERS = [
    "arn:aws:lambda:<AWS_REGION>:464622532012:layer:Datadog-PYTHON39-ARM:98",
    "arn:aws:lambda:<AWS_REGION>:464622532012:layer:Datadog-Extension-ARM:63",
]


def main():
    parser = argparse.ArgumentParser(description=f"Lambda Layer Update")

    parser.add_argument("--function-name", required=True, type=str, help="Name of the Lambda to update")
    parser.add_argument("--region", required=True, type=str, help="AWS region name")
    args = parser.parse_args()

    print(f"Updating layers of {args.function_name} to their latest versions")

    client = boto3.client("lambda", region_name=args.region)
    config = client.get_function_configuration(FunctionName=args.function_name)
    layers = get_layers(config)
    latest = get_latest_layer_versions(layers, client)

    # TODO: Remove this condition to enable datadog across all lambdas
    if "heimdall" in args.function_name:
        print("Adding Datadog Layers")
        dd_layers = get_datadog_layers(args.region)
        latest.extend(dd_layers)

    response = client.update_function_configuration(FunctionName=args.function_name, Layers=latest)

    print(f'Update status: {response["LastUpdateStatus"]}')


def get_layers(config: dict) -> list:
    print("Current layers")
    layers = []
    for layer in config.get("Layers", []):
        print(layer["Arn"])
        arn = layer["Arn"].rsplit(":", maxsplit=1)[0]
        if "Datadog-Extension" in arn or "Datadog-Python" in arn:
            # Skip Datadog layers
            continue
        layers.append(arn)
    return layers


def get_latest_layer_versions(layers: str, client: boto3.client) -> list:
    print("Updated layers")
    latest = []
    for layer in layers:
        response = client.list_layer_versions(LayerName=layer, MaxItems=1)
        updated = f'{layer}:{response["LayerVersions"][0]["Version"]}'
        print(updated)
        latest.append(updated)
    return latest


def get_datadog_layers(region: str):
    dd_layers = []
    for layer in DATADOG_LAYERS:
        layer = layer.replace("<AWS_REGION>", region)
        dd_layers.append(layer)

    return dd_layers


if __name__ == "__main__":
    main()

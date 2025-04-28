#!/usr/bin/env python3

import argparse

import boto3

datadog_layers = []


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
    latest.extend(datadog_layers)
    response = client.update_function_configuration(FunctionName=args.function_name, Layers=latest)

    print(f"Update status: {response['LastUpdateStatus']}")


def get_layers(config: dict) -> list:
    print("Current layers")
    layers = []
    for layer in config.get("Layers", []):
        print(layer["Arn"])
        arn = layer["Arn"].rsplit(":", maxsplit=1)[0]
        if "Datadog" in arn:
            # Skip Updates to Datadog layers
            datadog_layers.append(layer["Arn"])
            continue
        layers.append(arn)
    return layers


def get_latest_layer_versions(layers: str, client: boto3.client) -> list:
    print("Updated layers")
    latest = []
    for layer in layers:
        response = client.list_layer_versions(LayerName=layer, MaxItems=1)
        updated = f"{layer}:{response['LayerVersions'][0]['Version']}"
        print(updated)
        latest.append(updated)
    return latest


if __name__ == "__main__":
    main()

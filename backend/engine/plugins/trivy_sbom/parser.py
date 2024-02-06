"""
trivy output parser
"""
import json
from engine.plugins.lib import utils

logger = utils.setup_logging("trivy SBOM")

import json

def clean_output_application_sbom(output:list) -> list:
    results = []
    ignore_list = []
    deps = output["dependencies"]
    ignore_list.append(output["metadata"]["component"]["bom-ref"])
    for item in output["components"]:
        if (item["type"] == "application"):
            ignore_list.append(item["bom-ref"])
            continue
        bom_ref = item["bom-ref"]
        name = item["name"]
        version = item["version"]
        licenses=[]
        licenses_list = item.get("licenses", [])
        for lic in licenses_list:
            licenses.append({"name": lic.get("license").get("name")})
        properties = item.get("properties", [])
        for prop in properties:
            if prop["name"] == "aquasecurity:trivy:PkgType":
                type = convert_bundler(prop["value"])
                break
        results.append({
            "bom-ref" : bom_ref,
            "name" : name,
            "version" : version,
            "licenses": licenses,
            "type" : type
        })
    return results, deps, ignore_list

def convert_bundler(component_type: str) -> str:
    if component_type == "bundler":
        return "gem"
    return component_type.lower()

def convert_output(output_str: str):
    if not output_str:
        return None
    try:
        return json.loads(output_str)
    except json.JSONDecodeError as e:
        # logger.error(e)
        return None
    
# Convert CycloneDX data to a heirarchical tree graph
def convert_cyclonedx_to_tree(data:list, deps:list, ignore_list:list) -> tuple:
    graph = {}
    metadata={}

    for component in deps:
        ref = component.get("ref")
        # ignore the irrelevant bom-refs
        if ignore_list and ref in ignore_list:
            continue
        metadata[ref] = {}

        # Get the metadata for the current node
        for meta in data:
            bom_ref = meta.get("bom-ref")
            if ref == bom_ref:
                meta.pop("bom-ref")
                metadata[ref] = meta

        if ref is not None:
            # If the reference is not already in the graph, add it with an empty dict
            if ref not in graph:
                graph[ref] = {}
            # If "dependsOn" is not in the node's dictionary, add it as an empty list
            if "dependsOn" not in graph[ref]:
                graph[ref]["dependsOn"] = []

        # Get the dependencies for the current component
        depends_on = component.get("dependsOn", [])

        # Iterate over the dependencies
        for dependency in depends_on:
            # If the dependency is not in the graph, add it with an empty dictionary
            if dependency not in graph:
                graph[dependency] = {}
            # Add the dependency to the "dependsOn" list for the current node
            graph[ref]["dependsOn"].append(dependency)
    
    return graph, metadata

# Recursive function to build the hierachical tree
def recursive_hierarchy(graph, metadata, node):
    # Get children (dependencies) for the current node
    children = graph.get(node, {}).get("dependsOn", [])
    # Get Metadata for the current node
    node_metadata = metadata.get(node, {})

    # If there are no children, return a dictionary with the node's metadata
    if not children:
        return {**node_metadata, "deps": []}

    # If there are children, recursively call the function for each child and return their metadata and deps
    return {**node_metadata, "deps": [recursive_hierarchy(graph, metadata, child) for child in children]}

def root_nodes(tree_graph):
    roots = []

    for node in tree_graph[0]:
        depends_on = False

        for other_node in tree_graph[0].keys():
            dependencies = tree_graph[0].get(other_node, {}).get("dependsOn", [])
            if node in dependencies:
                depends_on = True
                break

        # If a node does not appear as a dependency for any other node, it is considered a root node
        if not depends_on:
            roots.append(node)
    return roots

def parser(output):
    output = convert_output(output)
    data, deps, ignore_list = clean_output_application_sbom(output)
   
    # Convert CycloneDX data to hierarchical tree
    hierarchical_tree_graph = convert_cyclonedx_to_tree(data, deps, ignore_list)

    # Get the root nodes
    roots = root_nodes(hierarchical_tree_graph)

    # Build the hierarchical tree starting from each root
    hierarchical_tree = [recursive_hierarchy(hierarchical_tree_graph[0], hierarchical_tree_graph[1], root) for root in roots]
    
    return hierarchical_tree
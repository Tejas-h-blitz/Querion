from typing import Any, Dict, List

def parse_plan_node(node_dict: Dict[str, Any]) -> Dict[str, Any]:
    if not node_dict:
        return {}

    node_type = node_dict.get("Node Type", "Unknown Node")
    relation = node_dict.get("Relation Name")
    alias = node_dict.get("Alias")
    index_name = node_dict.get("Index Name")
    
    name = node_type
    if index_name:
        name += f" using {index_name}"
    if relation:
        name += f" on {relation}"
        if alias and alias != relation:
            name += f" ({alias})"
            
    cost = node_dict.get("Total Cost", 0.0)
    # Prefer actual rows if available, fallback to plan rows
    actual_rows = node_dict.get("Actual Rows", node_dict.get("Plan Rows", 0))
    actual_total_time = node_dict.get("Actual Total Time", 0.0)
    loops = node_dict.get("Actual Loops", 1)
    
    children = []
    if "Plans" in node_dict:
        for sub_plan in node_dict["Plans"]:
            children.append(parse_plan_node(sub_plan))
            
    return {
        "name": name,
        "node_type": node_type,
        "relation_name": relation,
        "index_name": index_name,
        "cost": cost,
        "startup_cost": node_dict.get("Startup Cost", 0.0),
        "actual_rows": actual_rows,
        "actual_total_time": actual_total_time,
        "actual_startup_time": node_dict.get("Actual Startup Time", 0.0),
        "loops": loops,
        "filter": node_dict.get("Filter"),
        "join_type": node_dict.get("Join Type"),
        "children": children
    }

def parse_explain_output(explain_json: Any) -> Dict[str, Any]:
    if not explain_json:
        return {"tree": {}, "planning_time": 0.0, "execution_time": 0.0}
        
    if isinstance(explain_json, list):
        if len(explain_json) == 0:
            return {"tree": {}, "planning_time": 0.0, "execution_time": 0.0}
        query_data = explain_json[0]
    elif isinstance(explain_json, dict):
        query_data = explain_json
    else:
        return {"tree": {}, "planning_time": 0.0, "execution_time": 0.0}
        
    plan = query_data.get("Plan", {})
    parsed_tree = parse_plan_node(plan)
    
    return {
        "tree": parsed_tree,
        "planning_time": query_data.get("Planning Time", 0.0),
        "execution_time": query_data.get("Execution Time", 0.0)
    }

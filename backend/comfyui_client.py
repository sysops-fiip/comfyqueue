# backend/comfyui_client.py
"""
ComfyUI API client for job submission and status tracking
"""
import requests
import logging
from models import db, Node
from typing import Optional, Dict, Any, Tuple

logger = logging.getLogger(__name__)

# =====================================================
# --- Node Selection ---
# =====================================================
def select_available_node() -> Optional[Tuple[Node, int]]:
    """
    Select the least-loaded enabled node.

    Returns:
        Tuple of (Node, queue_size) or None if no nodes available
    """
    enabled_nodes = Node.query.filter_by(enabled=True).all()

    if not enabled_nodes:
        logger.warning("No enabled nodes available")
        return None

    best_node = None
    min_queue_size = float('inf')

    for node in enabled_nodes:
        try:
            queue_size = get_node_queue_size(node.url)
            logger.info(f"Node {node.name} ({node.url}) has {queue_size} jobs in queue")

            if queue_size < min_queue_size:
                min_queue_size = queue_size
                best_node = node

        except Exception as e:
            logger.error(f"Failed to check queue for node {node.name}: {e}")
            continue

    if best_node:
        logger.info(f"Selected node: {best_node.name} with {min_queue_size} jobs")
        return (best_node, min_queue_size)

    logger.warning("No responsive nodes found")
    return None


def get_node_queue_size(node_url: str) -> int:
    """
    Get the current queue size of a ComfyUI node.

    Args:
        node_url: Base URL of the ComfyUI node

    Returns:
        Number of jobs in queue (running + pending)
    """
    try:
        response = requests.get(f"{node_url}/queue", timeout=5)
        response.raise_for_status()
        data = response.json()

        queue_running = len(data.get("queue_running", []))
        queue_pending = len(data.get("queue_pending", []))

        return queue_running + queue_pending

    except Exception as e:
        logger.error(f"Error getting queue size from {node_url}: {e}")
        raise


# =====================================================
# --- ComfyUI API Functions ---
# =====================================================
def submit_workflow_to_comfyui(node_url: str, workflow_json: Dict[str, Any]) -> Optional[str]:
    """
    Submit a workflow to ComfyUI /prompt endpoint.

    Args:
        node_url: Base URL of the ComfyUI node
        workflow_json: The workflow JSON data

    Returns:
        ComfyUI prompt_id or None if failed
    """
    try:
        payload = {"prompt": workflow_json}
        response = requests.post(
            f"{node_url}/prompt",
            json=payload,
            timeout=10
        )
        response.raise_for_status()
        data = response.json()

        prompt_id = data.get("prompt_id")
        queue_number = data.get("number")

        logger.info(f"Workflow submitted to {node_url}. Prompt ID: {prompt_id}, Queue #: {queue_number}")
        return prompt_id

    except Exception as e:
        logger.error(f"Failed to submit workflow to {node_url}: {e}")
        return None


def check_job_status(node_url: str, prompt_id: str) -> Dict[str, Any]:
    """
    Check job status from ComfyUI /history endpoint.

    Args:
        node_url: Base URL of the ComfyUI node
        prompt_id: The ComfyUI prompt ID

    Returns:
        Dictionary with 'status', 'outputs', 'error' keys
    """
    try:
        response = requests.get(f"{node_url}/history/{prompt_id}", timeout=5)
        response.raise_for_status()
        data = response.json()

        if prompt_id not in data:
            # Job not in history yet, still in queue
            return {"status": "running", "outputs": None, "error": None}

        job_data = data[prompt_id]

        # Check if there's an error
        if "error" in job_data or job_data.get("status", {}).get("status_str") == "error":
            error_msg = job_data.get("error", {}).get("message", "Unknown error")
            return {"status": "failed", "outputs": None, "error": error_msg}

        # Check if completed
        if job_data.get("status", {}).get("completed", False):
            outputs = job_data.get("outputs", {})
            return {"status": "completed", "outputs": outputs, "error": None}

        # Still running
        return {"status": "running", "outputs": None, "error": None}

    except Exception as e:
        logger.error(f"Failed to check status for {prompt_id} on {node_url}: {e}")
        return {"status": "unknown", "outputs": None, "error": str(e)}


def get_job_results(node_url: str, prompt_id: str) -> Dict[str, Any]:
    """
    Get job results from ComfyUI /history endpoint.

    Args:
        node_url: Base URL of the ComfyUI node
        prompt_id: The ComfyUI prompt ID

    Returns:
        Dictionary with outputs and metadata
    """
    try:
        response = requests.get(f"{node_url}/history/{prompt_id}", timeout=5)
        response.raise_for_status()
        data = response.json()

        if prompt_id not in data:
            return {"error": "Job not found in history"}

        job_data = data[prompt_id]
        outputs = job_data.get("outputs", {})

        # Process outputs to include full URLs
        processed_outputs = {}
        for node_id, output_data in outputs.items():
            if "images" in output_data:
                images = []
                for img in output_data["images"]:
                    filename = img.get("filename")
                    subfolder = img.get("subfolder", "")
                    img_type = img.get("type", "output")

                    # Build view URL
                    view_url = f"{node_url}/view?filename={filename}&subfolder={subfolder}&type={img_type}"
                    images.append({
                        "filename": filename,
                        "url": view_url,
                        "subfolder": subfolder,
                        "type": img_type
                    })
                processed_outputs[node_id] = {"images": images}
            else:
                processed_outputs[node_id] = output_data

        return {
            "prompt_id": prompt_id,
            "outputs": processed_outputs,
            "status": job_data.get("status", {})
        }

    except Exception as e:
        logger.error(f"Failed to get results for {prompt_id} on {node_url}: {e}")
        return {"error": str(e)}


def test_node_connection(node_url: str) -> bool:
    """
    Test if a ComfyUI node is reachable.

    Args:
        node_url: Base URL of the ComfyUI node

    Returns:
        True if node is reachable, False otherwise
    """
    try:
        response = requests.get(f"{node_url}/system_stats", timeout=3)
        return response.status_code == 200
    except:
        return False

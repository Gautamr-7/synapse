import requests
import base64

class Synapse:

    def get_dna(self, task_type: str):
        """Check if previous agents have figured out this task."""
        res = requests.get(f"{self.base_url}/dna/{task_type}")
        if res.status_code == 200:
            data = res.json()
            if data.get("found"):
                print(f"🧬 [Synapse DNA] Inherited knowledge for '{task_type}' from {data['dna']['success_count']} previous agents.")
                return data['dna']['optimal_path']
        print(f"🧬 [Synapse DNA] No previous playbook found for '{task_type}'. Agent starting from zero.")
        return None

    def distill_dna(self, task_type: str, optimal_path: str):
        """Upload the successful workflow to the collective hive mind."""
        payload = {"task_type": task_type, "optimal_path": optimal_path}
        res = requests.post(f"{self.base_url}/dna/distill", json=payload)
        if res.status_code == 200:
            print(f"🌍 [Synapse DNA] Workflow successfully distilled! All future agents will inherit this path.")
            
    def __init__(self, api_key: str, base_url: str = "https://synapse-backend-b5k1.onrender.com"):
        self.api_key = api_key
        self.base_url = base_url
        self.session_id = None
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    def start_session(self, session_id: str, agent_name: str = "Playwright Agent", goal: str = "Automated Task"):
        """Initializes a session to track memory and visuals."""
        self.session_id = session_id
        # In a full build, this would hit /session/create
        print(f"[Synapse] Session {session_id} initialized.")
        return self.session_id

    def save_memory(self, key: str, value: str, memory_type: str = "variable"):
        """Saves logical context to the Synapse database."""
        if not self.session_id:
            raise ValueError("Call start_session() first.")
        
        payload = {
            "session_id": self.session_id,
            "key": key,
            "value": value,
            "memory_type": memory_type
        }
        requests.post(f"{self.base_url}/memory/save", json=payload, headers=self.headers)
        print(f"[Synapse] Memory saved: {key}")

    def capture_step(self, page, step_name: str, action_taken: str = "", outcome: str = ""):
        """Takes a screenshot and sends it to the Action Replay dashboard."""
        if not self.session_id:
            raise ValueError("Call start_session() first.")
        
        # Take a low-quality JPEG to keep the payload fast and small
        screenshot_bytes = page.screenshot(type='jpeg', quality=30)
        b64_string = base64.b64encode(screenshot_bytes).decode('utf-8')

        payload = {
            "step_name": step_name,
            "action_taken": action_taken,
            "outcome": outcome,
            "image_data": b64_string
        }
        
        # We use the endpoint we set up for Action Replay
        requests.post(f"{self.base_url}/visual/capture/{self.session_id}", json=payload, headers=self.headers)
        print(f"[Synapse] Visual captured: {step_name}")
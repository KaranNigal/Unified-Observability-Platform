import json
import sys
import time
import urllib.request

# Constants
ilm_url = "http://localhost:9200/_ilm/policy/logs_retention_policy"
ilm_policy = {
    "policy": {"phases": {"delete": {"min_age": "7d", "actions": {"delete": {}}}}}
}

template_url = "http://localhost:9200/_index_template/logs_retention"
template_payload = {
    "index_patterns": ["logs-*"],
    "template": {"settings": {"index.lifecycle.name": "logs_retention_policy"}},
    "priority": 200,
}


def make_request(url, data_dict, method="PUT"):
    req = urllib.request.Request(
        url,
        data=json.dumps(data_dict).encode("utf-8") if data_dict is not None else None,
        headers={"Content-Type": "application/json"},
        method=method,
    )
    with urllib.request.urlopen(req) as response:
        return response.status


print("Starting Elasticsearch bootstrap script...")
for i in range(20):
    try:
        # Check if Elasticsearch is healthy
        health_req = urllib.request.Request("http://localhost:9200/")
        with urllib.request.urlopen(health_req) as response:
            if response.status == 200:
                print("Elasticsearch is healthy!")

                # 1. Upload ILM policy
                print("Uploading ILM policy logs_retention_policy...")
                ilm_status = make_request(ilm_url, ilm_policy)
                print(f"ILM upload status: {ilm_status}")

                # 2. Upload Index Template
                print("Uploading Composable Index Template logs_retention...")
                tmpl_status = make_request(template_url, template_payload)
                print(f"Index Template upload status: {tmpl_status}")

                # 3. Apply settings to any existing indices matching logs-*
                print("Applying ILM settings to any pre-existing daily log indices...")
                try:
                    indices_req = urllib.request.Request("http://localhost:9200/logs-*")
                    with urllib.request.urlopen(indices_req) as ind_res:
                        indices_data = json.loads(ind_res.read().decode())
                        for index_name in indices_data.keys():
                            print(
                                f"Applying logs_retention_policy to existing index: {index_name}"
                            )
                            update_status = make_request(
                                f"http://localhost:9200/{index_name}/_settings",
                                {"index.lifecycle.name": "logs_retention_policy"},
                            )
                            print(
                                f"Updated index settings status for {index_name}: {update_status}"
                            )
                except Exception as ex:
                    print(f"No pre-existing indices found or error updating: {ex}")

                if ilm_status == 200 and tmpl_status == 200:
                    print("Elasticsearch successfully bootstrapped!")
                    sys.exit(0)
    except Exception as e:
        print(f"Elasticsearch not ready yet (attempt {i+1}/20)... Error: {e}")
        time.sleep(5)

print("Failed to bootstrap Elasticsearch after 20 attempts.")
sys.exit(1)

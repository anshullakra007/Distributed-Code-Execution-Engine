import argparse
import concurrent.futures
import requests
import time
import statistics

URL = "http://localhost:8080/api/run"

PAYLOADS = {
    "cpp": {
        "language": "cpp",
        "code": "#include <iostream>\nusing namespace std;\nint main() {\n  cout << \"Hello from C++!\" << endl;\n  return 0;\n}",
        "input": ""
    },
    "java": {
        "language": "java",
        "code": "public class Main {\n  public static void main(String[] args) {\n    System.out.println(\"Hello from Java!\");\n  }\n}",
        "input": ""
    },
    "python": {
        "language": "python",
        "code": "print('Hello from Python!')",
        "input": ""
    }
}

def make_request(lang):
    start = time.time()
    try:
        resp = requests.post(URL, json=PAYLOADS[lang], timeout=15)
        elapsed = time.time() - start
        if resp.status_code == 200:
            return True, elapsed
        else:
            return False, elapsed
    except Exception:
        return False, time.time() - start

def main():
    parser = argparse.ArgumentParser(description="Load testing script for CodeEngine API")
    parser.add_argument("-c", "--concurrency", type=int, default=20, help="Number of concurrent workers")
    parser.add_argument("-n", "--requests", type=int, default=100, help="Total number of requests")
    parser.add_argument("--all", action="store_true", help="Test all languages")
    parser.add_argument("--lang", type=str, choices=["cpp", "java", "python"], default="python", help="Language to test")
    
    args = parser.parse_args()
    
    langs_to_test = ["cpp", "java", "python"] if args.all else [args.lang]
    
    print(f"Starting Benchmark: {args.requests} requests across {args.concurrency} workers.")
    print(f"Languages: {', '.join(langs_to_test)}")
    
    results = []
    successes = 0
    failures = 0
    
    start_time = time.time()
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as executor:
        futures = []
        for i in range(args.requests):
            lang = langs_to_test[i % len(langs_to_test)]
            futures.append(executor.submit(make_request, lang))
            
        for future in concurrent.futures.as_completed(futures):
            success, elapsed = future.result()
            results.append(elapsed)
            if success:
                successes += 1
            else:
                failures += 1
                
    total_time = time.time() - start_time
    
    print("\n--- Benchmark Results ---")
    print(f"Total Requests: {args.requests}")
    print(f"Successes:      {successes}")
    print(f"Failures:       {failures}")
    print(f"Success Rate:   {(successes/args.requests)*100:.2f}%")
    print(f"Total Time:     {total_time:.2f}s")
    print(f"Throughput:     {args.requests / total_time:.2f} requests/sec")
    
    if results:
        print(f"Mean Latency:   {statistics.mean(results)*1000:.2f} ms")
        print(f"Max Latency:    {max(results)*1000:.2f} ms")
        print(f"Min Latency:    {min(results)*1000:.2f} ms")

if __name__ == "__main__":
    main()

import argparse
import concurrent.futures
import json
import statistics
import time
import urllib.request
import urllib.error

API_URL = "http://localhost:8080/api/run"

PAYLOADS = {
    "python": {
        "language": "python",
        "code": "print('Hello Benchmark')",
        "input": ""
    },
    "cpp": {
        "language": "cpp",
        "code": "#include <iostream>\nint main() { std::cout << \"Hello Benchmark\" << std::endl; return 0; }",
        "input": ""
    },
    "java": {
        "language": "java",
        "code": "public class Main { public static void main(String[] args) { System.out.println(\"Hello Benchmark\"); } }",
        "input": ""
    }
}

def make_request(language):
    payload = json.dumps(PAYLOADS[language]).encode('utf-8')
    req = urllib.request.Request(API_URL, data=payload, headers={'Content-Type': 'application/json'})
    
    start_time = time.time()
    try:
        with urllib.request.urlopen(req) as response:
            status = response.getcode()
            response.read()
    except urllib.error.HTTPError as e:
        status = e.code
    except urllib.error.URLError as e:
        status = 0
    end_time = time.time()
    
    return {
        "latency_ms": (end_time - start_time) * 1000,
        "status": status
    }

def run_benchmark(concurrency, total_requests, language):
    print(f"Starting benchmark for {language} with concurrency {concurrency} and total requests {total_requests}")
    
    results = []
    start_time = time.time()
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(make_request, language) for _ in range(total_requests)]
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())
            
    end_time = time.time()
    total_time = end_time - start_time
    
    successful = [r for r in results if r["status"] == 200]
    failed = [r for r in results if r["status"] != 200]
    latencies = [r["latency_ms"] for r in successful]
    
    print("\n--- Benchmark Results ---")
    print(f"Language: {language}")
    print(f"Total Time: {total_time:.2f}s")
    print(f"Total Requests: {total_requests}")
    print(f"Successful Requests: {len(successful)}")
    print(f"Failed Requests: {len(failed)}")
    
    if latencies:
        print(f"Requests/sec: {len(successful) / total_time:.2f}")
        print(f"Min Latency: {min(latencies):.2f}ms")
        print(f"Max Latency: {max(latencies):.2f}ms")
        print(f"Mean Latency: {statistics.mean(latencies):.2f}ms")
        print(f"Median Latency: {statistics.median(latencies):.2f}ms")
        if len(latencies) > 1:
            print(f"95th Percentile: {statistics.quantiles(latencies, n=100)[94]:.2f}ms")
            print(f"99th Percentile: {statistics.quantiles(latencies, n=100)[98]:.2f}ms")
    else:
        print("No successful requests to calculate latency statistics.")
        
    return {
        "language": language,
        "concurrency": concurrency,
        "total_requests": total_requests,
        "total_time_s": total_time,
        "successful": len(successful),
        "failed": len(failed),
        "requests_per_sec": len(successful) / total_time if total_time > 0 else 0,
        "min_latency_ms": min(latencies) if latencies else 0,
        "max_latency_ms": max(latencies) if latencies else 0,
        "mean_latency_ms": statistics.mean(latencies) if latencies else 0,
        "p95_latency_ms": statistics.quantiles(latencies, n=100)[94] if len(latencies) > 1 else (latencies[0] if latencies else 0),
        "p99_latency_ms": statistics.quantiles(latencies, n=100)[98] if len(latencies) > 1 else (latencies[0] if latencies else 0)
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CodeEngine Benchmark Tool")
    parser.add_argument("-c", "--concurrency", type=int, default=10, help="Number of concurrent requests")
    parser.add_argument("-n", "--requests", type=int, default=50, help="Total number of requests")
    parser.add_argument("-l", "--language", type=str, choices=["python", "cpp", "java"], default="python", help="Language to benchmark")
    parser.add_argument("--all", action="store_true", help="Benchmark all languages")
    parser.add_argument("-o", "--output", type=str, help="Output JSON file for results")
    
    args = parser.parse_args()
    
    languages = ["python", "cpp", "java"] if args.all else [args.language]
    all_results = []
    
    for lang in languages:
        res = run_benchmark(args.concurrency, args.requests, lang)
        all_results.append(res)
        print("\n" + "="*40 + "\n")
        
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(all_results, f, indent=2)
        print(f"Results saved to {args.output}")

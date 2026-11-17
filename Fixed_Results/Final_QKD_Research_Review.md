# QBioAuth — Final QKD-D Experimental Review

**Source:** `qkd_merged_3700_valid.csv`, plus verified JSONL (3,700 parseable records). **Design:** 37 cases × 100 trials.

## Data integrity and outcome status

- 3,700 total trial records; 3,000 original non-distance rounds and 700 versioned distance-repair rounds. Two provenance manifests are expected; no duplicate (case_id, trial_index) IDs.
- **1,793 successes**, **1,807 protocol aborts**, **100 modeled acquisition-budget aborts**, **0 execution errors**. These categories are not interchangeable.
- The overall pooled acceptance rate is **48.46%**, but it is not an estimator of deployed QKD availability because conditions were deliberately selected and balanced.
- All 1,793 successful records show successful key matching and AES round-trip tests. No secret key bytes were included in this analysis file.

## Distance study

| Distance | Successes/100 | 95% Wilson CI | Mean transmitted pulses | Mean optical acquisition time | Mean usable bits (successful only) |
|---:|---:|---:|---:|---:|---:|
| 0 km | 99/100 | 94.6%–99.8% | 691,405 | 0.69 s | 1,146.8 |
| 20 km | 100/100 | 96.3%–100.0% | 1,711,309 | 1.71 s | 1,101.2 |
| 50 km | 98/100 | 93.0%–99.4% | 6,665,011 | 6.67 s | 1,114.4 |
| 80 km | 100/100 | 96.3%–100.0% | 26,501,530 | 26.50 s | 1,167.9 |
| 100 km | 99/100 | 94.6%–99.8% | 66,788,966 | 66.79 s | 1,066.0 |
| 150 km | 96/100 | 90.2%–98.4% | 657,411,277 | 657.41 s | 780.6 |
| 200 km | 0/100 | 0.0%–3.7% | 2,000,000,000 | 2,000.00 s | — |

At 200 km, all 100 runs ended `ABORT_PHYSICAL_ACQUISITION` / `ROUND_LIMIT_EXCEEDED`, after 2 billion modeled pulses and 2,000 modeled seconds. That is a profile-specific acquisition-budget limit, **not a universal maximum secure QKD distance**. The 0–150 km trials use a two-stage optical accumulation → QKD simulator; loss and basis outcomes are **not coupled pulse by pulse**.

**Runtime distinction:** `wall_seconds` is Python wall-clock execution; `physical_estimated_optical_acquisition_seconds` is modeled optical time. They must not be added or confused as a validated deployment latency. The 200 km Python runtime is near zero because the physical stage aborts before running the signed QKD stages.

## QBER and reconciliation

| Configured QBER | Successful/100 | Mean declared EC leak | Mean usable bits among successes |
|---:|---:|---:|---:|
| 0% | 100/100 | 2048.0 bits | 794.0 |
| 0.5% | 100/100 | 1144.8 bits | 1697.2 |
| 1% | 100/100 | 1717.6 bits | 1124.4 |
| 2% | 1/100 | 2946.1 bits | 354.0 |
| 3% | 0/100 | 4030.2 bits | — |
| 4% | 0/100 | 5061.4 bits | — |
| 5% | 0/100 | 5981.2 bits | — |
| 6% | 0/100 | 6784.0 bits | — |
| 8% | 0/100 | — bits | — |

The high-QBER failure is primarily a finite-key extraction-budget abort. The zero-QBER configuration has 2,048 declared leakage bits (1,920 parity + 128 tag) because its initial Cascade block is smaller; this is a configuration-specific inefficiency, not an automatically smooth physical law.

## Basis-bias and attacks

- Basis bias `pZ` = 0.50–0.85: 100/100 success at each of five tested settings; at 0.90 and 0.9375: 0/100, because acquisition requirements were not met under the configured detection budget.
- All 100 dedicated intercept/resend attempts were rejected; all 600 Eve-enabled interaction trials were also rejected at parameter estimation (700/700 modeled attack cases). These findings are strategy-specific, not proof against general quantum attacks.
- 1% QBER without Eve: three interaction configurations all had 100/100 acceptance; 4% QBER without Eve: all three had 0/100.

## Audit cautions retained for the manuscript

- Finite-key phase-error theorem correspondence, complete adaptive Cascade transcript leakage, explicit epsilon allocation, and general quantum-adversary security are **not proved** by the experiments.
- The classical authentication is ML-DSA (computational) and payload encryption is AES-GCM (computational). The overall session must not be described as information-theoretically secure.
- Modelled attenuation/detection and simulated QKD are two stages, not a single photon-level coupled physical experiment.
- Avoid calculating mean output key length across aborted trials by substituting zero for missing PA values unless specifically defining **net yield per attempted session**.

## Figures and exports

Eight SVG and PNG figures are included in this folder. `case_summary_37.csv` contains the 37 case counts, Wilson confidence intervals, key/leakage metrics, stage runtime and distance metrics. `distance_trial_details.csv` retains all repaired distance rows.

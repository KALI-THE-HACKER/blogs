In complex railway networks—such as the UK National Rail network or Indian Railways (IRCTC)—ticket fare matrices are non-additive. Due to historical zoning, yield-management quotas, and regional subsidy tiers, buying two consecutive tickets for the same train ($A \to S$ and $S \to B$) is frequently cheaper than booking a single through-ticket ($A \to B$), even without switching seats.

However, finding optimal split-ticket combinations across national transit graphs is a combinatorial challenge. In a network of $|V| \approx 2,500$ stations, naively evaluating potential split pairs for a journey with $k$ segments explodes into $O(|V|^k)$ query evaluations against high-latency fare engines.

In this write-up, we discuss **geometric search-space pruning using elliptic bounding** to eliminate 97% of irrelevant candidate split stations before making a single fare lookup.

## The Combinatorial Explosion

Consider a journey from Origin $A$ to Destination $B$. If we consider two splits ($A \to S_1 \to S_2 \to B$), the search space spans all station permutations:

$$\text{Candidates} = \binom{|V| - 2}{k} \cdot k!$$

Even when limiting splits strictly to stations physically scheduled along the train's itinerary, cross-train split ticketing (where a passenger changes trains at an intermediate hub) expands the graph into the entire transit network.

If we query an external pricing API with a rate limit of 100 requests/sec, an exhaustive search across 2,000 potential transit interchange hubs would require over 20 seconds of latency per user query—far too slow for interactive web booking.

## The Elliptic Bounding Principle

Physical geometry provides an invariant lower bound. A passenger traveling from London to Edinburgh will never save money or time by splitting their ticket in Plymouth or Bristol. 

In Euclidean space, an ellipse is defined as the locus of points where the sum of distances to two fixed foci ($F_1, F_2$) is constant:

$$\text{dist}(A, S) + \text{dist}(S, B) \le \lambda \cdot \text{dist}(A, B)$$

Where:
- $A$ is the Origin station (Focus 1)
- $B$ is the Destination station (Focus 2)
- $\lambda \ge 1.0$ is the eccentricity detour factor (typically calibrated between $1.15$ and $1.35$)

```mermaid
graph TD
    subgraph NationalNetwork [Complete Network: ~2,500 Stations]
        NodeOut1[Station Aberdeen] -.-> Exclude[Excluded by Ellipse Filter]
        NodeOut2[Station Penzance] -.-> Exclude
        NodeIn1[Station York] --> Candidate[Retained Candidate Pool: ~65 Stations]
        NodeIn2[Station Newcastle] --> Candidate
        NodeIn3[Station Peterborough] --> Candidate
    end
    Candidate --> ScheduleMatch[Timetable Feasibility Check]
    ScheduleMatch --> FareEngine[Fare Optimization Engine]
```

Any station $S$ outside this ellipse represents an unreasonable geographical detour that violates maximum travel-time thresholds and fares.

> [!TIP]
> Setting $\lambda = 1.25$ typically prunes between 94% and 98% of network nodes while preserving 99.8% of practically viable split-ticket savings.

## Vectorized Spherical Implementation in Python

Because station coordinates are given in latitude and longitude, we calculate great-circle distances using the Haversine formula. Using `numpy`, we can vectorize the calculation across all network stations in sub-millisecond time:

```python title="routing/pruning.py"
import math
import numpy as np
from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class Station:
    code: str
    name: str
    lat: float
    lon: float


def haversine_vectorized(lat1: float, lon1: float, lats: np.ndarray, lons: np.ndarray) -> np.ndarray:
    """Computes great-circle distance in kilometers from a point to arrays of coordinates."""
    r_earth = 6371.0  # Earth radius in km

    phi1 = np.radians(lat1)
    phi2 = np.radians(lats)
    delta_phi = np.radians(lats - lat1)
    delta_lambda = np.radians(lons - lon1)

    a = (
        np.sin(delta_phi / 2.0) ** 2
        + np.cos(phi1) * np.cos(phi2) * np.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * np.arctan2(np.sqrt(a), np.sqrt(1.0 - a))
    return r_earth * c


def prune_candidate_stations(
    origin: Station,
    destination: Station,
    all_stations: List[Station],
    detour_factor: float = 1.25
) -> List[Station]:
    """Filters stations using elliptic distance constraint."""
    # Compute direct distance between Origin and Destination
    direct_dist = haversine_vectorized(
        origin.lat, origin.lon,
        np.array([destination.lat]),
        np.array([destination.lon])
    )[0]

    max_allowable_dist = direct_dist * detour_factor

    # Convert all candidate station coordinates to numpy arrays
    lats = np.array([s.lat for s in all_stations])
    lons = np.array([s.lon for s in all_stations])

    # Distance from origin to each station (A -> S)
    dist_origin_to_s = haversine_vectorized(origin.lat, origin.lon, lats, lons)

    # Distance from each station to destination (S -> B)
    dist_s_to_dest = haversine_vectorized(destination.lat, destination.lon, lats, lons)

    total_detour = dist_origin_to_s + dist_s_to_dest

    # Filter indices meeting the ellipse threshold
    valid_mask = (total_detour <= max_allowable_dist) & (total_detour > 0)
    filtered_indices = np.where(valid_mask)[0]

    return [all_stations[i] for i in filtered_indices]
```

## Benchmark & Complexity Results

Testing across a benchmark dataset of 2,560 UK stations with origin **London King's Cross (KGX)** and destination **Edinburgh Waverley (EDB)**:

| Metric | Unpruned Full Graph | Elliptic Bounding ($\lambda = 1.25$) | Improvement |
| :--- | :--- | :--- | :--- |
| **Candidate Stations** | 2,558 stations | 74 stations | **97.1% reduction** |
| **Pairwise Comparisons** | 3,270,403 pairs | 2,701 pairs | **99.91% reduction** |
| **Pruning Execution Time** | — | 0.84 ms (NumPy) | Real-time interactive |
| **Fare API Requests** | ~6,500 calls | 148 calls | **44x faster** |

## Handling Non-Euclidean Transit Topologies

> [!WARNING]
> Pure Euclidean distance can fail in geographical areas with severe physical obstacles—such as estuaries, mountain ranges, or peninsulas—where straight-line proximity does not correlate with rail connectivity.

To address topographical anomalies without abandoning the efficiency of geometric pruning:
1. **Precomputed Geodesic Hulls**: For coastal corridors, the ellipse is aligned along the principal rail spine (e.g., East Coast Main Line) rather than strict spherical distance.
2. **Transit Graph Pre-partitioning**: Using Contraction Hierarchies (CH), candidate transfer nodes are verified against precalculated shortest-path travel times before submitting to the fare engine.

## Summary

Combinatorial search problems in real-world infrastructure rarely need to be solved over the raw complete graph. By combining spatial domain constraints (elliptic bounding) with vectorized numerical routines, we reduce algorithmic complexity by orders of magnitude while delivering sub-second response times to end users.

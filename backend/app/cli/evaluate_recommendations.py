"""CLI entrypoint for offline recommendation evaluation and calibration.

Usage:
    python -m app.cli.evaluate_recommendations [--output-json PATH] [--output-report PATH] [--output-calibration PATH]
"""

from app.recommendation.evaluation.runner import main

if __name__ == "__main__":
    main()

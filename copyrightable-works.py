import argparse

from src.report_generator import ReportGenerator


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-v", "--verbose", dest="verbose", help="Verbose logs", action="store_true"
    )
    args = parser.parse_args()

    generator = ReportGenerator(args)
    generator.generate()

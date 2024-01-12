# Copyrightable Works Report Generator

The Copyrightable Works Report Generator is a simple Python application that checks for commits in specified repositories and generates a DOCX document containing a copyrightable works report based on those commits. This report is designed to capture and document your contributions and activities for a current reporting month.

## Prerequisites

Before you can use this application, make sure you have the following installed:

- Python (3.11 or higher)
- `pip` package manager

> **Note:**
> You can install Python from Microsoft Store, it should automatically add the python interpreter to your PATH variables

## Installation

1. Clone this repository to your local machine
2. Navigate to the project directory:

```bash
cd copyrightable-works-reports
```

3. Install the required Python packages:

```bash
pip install -r requirements.txt
```

## Configuration

Create a .env file in the project directory with the following environment variables:

- NAME: Your name.
- APPROVER: Your report's approver's name.
- AUTHOR: Your git username.
- AUTHOR_EMAIL: Your git email.
- REPOS: comma separated paths to repositories.

### Example .env file

```
NAME=John Doe
APPROVER=Jane Doe
AUTHOR=jdoe-fadv
AUTHOR_EMAIL=john.doe@fadv.com
REPOS=C:/programming/repo-1,C:/programming/repo-2
```

## Usage

```bash
python ./copyrightable-works.py
```

The generated report will be saved in the dist directory with a filename following the format YYYY.MM_Name.docx, where YYYY is the current year, MM is the current month (zero-padded), and Name is your name.

import calendar
from dotenv import load_dotenv
from datetime import datetime
from pathlib import Path
from os import listdir, environ
from os.path import isdir, join, basename
from alive_progress import alive_bar

from src.document_generator import DocumentGenerator
from src.git_repository import GitRepository


class ReportGenerator:
    def __init__(self, args):
        if not load_dotenv():
            print("No .env file found. Please create one in the root directory.")
            exit(-1)

        self.args = args
        self.name = environ.get("NAME").strip()
        self.approver = environ.get("APPROVER").strip()
        self.author = environ.get("AUTHOR").strip()
        self.author_email = environ.get("AUTHOR_EMAIL").strip()
        self.repos_dir_path = environ.get("REPOS_DIR_PATH")
        self.exclude_repos = (
            environ.get("REPOS_EXCLUDE").replace(" ", "").split(",")
            if environ.get("REPOS_EXCLUDE")
            else []
        )
        self.repos = self._get_repositories()
        self.filename = self._generate_filename()

    def _generate_filename(self):
        return f'{datetime.today().year}.{str(datetime.today().month).zfill(2)}_{self.name.replace(" ", "_")}.docx'

    def _get_repositories(self):
        if self.repos_dir_path:
            return [
                join(self.repos_dir_path, repo)
                for repo in listdir(self.repos_dir_path)
                if repo not in self.exclude_repos
                and isdir(join(self.repos_dir_path, repo))
            ]
        else:
            return environ.get("REPOS").replace(" ", "").split(",")

    def generate(self):
        output_path = f"./dist/{self.filename}"
        Path("./dist").mkdir(parents=True, exist_ok=True)

        document = DocumentGenerator(
            template_path="./assets/template.docx",
            output_path=output_path,
            employee_name=self.name,
            approver=self.approver,
            reporting_month=calendar.month_name[datetime.today().month],
            year=datetime.today().year,
        )
        document.setup_employee_data()

        with alive_bar(len(self.repos)) as bar:
            for repo_path in self.repos:
                repo = GitRepository(repo_path, self.args.verbose)
                bar.text(f"Processing: {basename(repo_path)}")
                repo.fetch()
                commits = repo.get_commits(
                    author=self.author,
                    author_email=self.author_email,
                    since_date=f"01.{str(datetime.today().month).zfill(2)}.{datetime.today().year}",
                )
                if commits:
                    if self.args.verbose:
                        print(f"Found commits in: {repo_path}")
                    document.add_repository_data(repo.get_remote_url(), commits)
                bar()

        document.finalize()
        print(f"File created: {output_path}")

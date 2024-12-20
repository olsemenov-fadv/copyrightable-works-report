from subprocess import Popen, PIPE
from os.path import basename


class GitRepository:
    def __init__(self, path, verbose=False):
        self.path = path
        self.verbose = verbose

    def run_command(self, command):
        process = Popen(
            command,
            stdout=PIPE,
            shell=True,
            universal_newlines=True,
            stderr=PIPE,
            text=True,
            cwd=self.path,
            encoding="utf-8",
            errors="replace",
        )
        out, err = process.communicate()
        if err and self.verbose:
            print(f"Error in {self.path}: {err}")
        return out.strip()

    def fetch(self):
        if self.verbose:
            print(f"Fetching recent logs for: {basename(self.path)}")
        return self.run_command("git fetch")

    def get_remote_url(self):
        url = self.run_command("git config --get remote.origin.url")
        return url.replace(".git", "").replace("git@github.com:", "https://github.com/")

    def get_commits(self, author, author_email, since_date):
        command = f"git log origin/main --author={author_email} --author={author} --since='{since_date}' --reverse"
        return self.run_command(command)

import contextlib
import io
from interpreter import Interpreter

def run_browser(script: str, debug: bool = False) -> str:
    buffer = io.StringIO()
    interpreter = Interpreter(debug=debug)
    with contextlib.redirect_stdout(buffer), contextlib.redirect_stderr(buffer):
        try:
            interpreter.run(script)
        except SystemExit as exc:
            if exc.code not in (0, None):
                print(f"SystemExit({exc.code})")
    return buffer.getvalue()

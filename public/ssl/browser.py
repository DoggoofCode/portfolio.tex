import contextlib
import io
import json

from interpreter import InputRequest, Interpreter

_current_interpreter: Interpreter | None = None
_current_buffer: io.StringIO | None = None
_pending_input: str | None = None
_output_offset: int = 0


def request_input(prompt: str = "") -> str:
    global _pending_input
    if _pending_input is not None:
        value = _pending_input
        _pending_input = None
        return value
    raise InputRequest(prompt)


def _run_with_redirect(interpreter: Interpreter, row_ptr: int | None = None) -> None:
    assert _current_buffer is not None
    with contextlib.redirect_stdout(_current_buffer), contextlib.redirect_stderr(_current_buffer):
        interpreter.walk_tree(row_ptr)


def run_browser(script: str, debug: bool = False) -> str:
    global _current_interpreter, _current_buffer, _pending_input, _output_offset
    buffer = io.StringIO()
    interpreter = Interpreter(debug=debug)
    _current_interpreter = interpreter
    _current_buffer = buffer
    _pending_input = None
    _output_offset = 0
    with contextlib.redirect_stdout(buffer), contextlib.redirect_stderr(buffer):
        try:
            interpreter.run(script)
        except InputRequest as exc:
            current_output = buffer.getvalue()
            _output_offset = len(current_output)
            return json.dumps(
                {
                    "kind": "input",
                    "output": current_output,
                    "prompt": exc.prompt,
                    "row_ptr": interpreter.current_row_ptr,
                }
            )
        except SystemExit as exc:
            if exc.code not in (0, None):
                print(f"SystemExit({exc.code})")
    _current_interpreter = None
    _current_buffer = None
    _output_offset = 0
    return json.dumps({"kind": "complete", "output": buffer.getvalue()})


def resume_browser(input_value: str) -> str:
    global _current_interpreter, _current_buffer, _pending_input, _output_offset
    if _current_interpreter is None or _current_buffer is None:
        raise RuntimeError("No paused program to resume.")
    _pending_input = input_value
    with contextlib.redirect_stdout(_current_buffer), contextlib.redirect_stderr(_current_buffer):
        try:
            _current_interpreter.walk_tree(_current_interpreter.current_row_ptr)
        except InputRequest as exc:
            current_output = _current_buffer.getvalue()
            output_delta = current_output[_output_offset:]
            _output_offset = len(current_output)
            return json.dumps(
                {
                    "kind": "input",
                    "output": output_delta,
                    "prompt": exc.prompt,
                    "row_ptr": _current_interpreter.current_row_ptr,
                }
            )
        except SystemExit as exc:
            if exc.code not in (0, None):
                print(f"SystemExit({exc.code})")
    output = _current_buffer.getvalue()[_output_offset:]
    _current_interpreter = None
    _current_buffer = None
    _output_offset = 0
    return json.dumps({"kind": "complete", "output": output})

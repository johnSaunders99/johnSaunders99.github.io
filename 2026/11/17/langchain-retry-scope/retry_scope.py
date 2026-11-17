"""Compare three LangChain retry boundaries with deterministic model replies."""

from langchain_core.exceptions import OutputParserException
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.runnables import RunnableLambda

retry = {
    "retry_if_exception_type": (OutputParserException,),
    "stop_after_attempt": 2,
    "wait_exponential_jitter": False,
}


def run(scope):
    calls = {"lookup": 0, "model": 0, "parse": 0}
    replies = iter(["Send this to support.", '{"queue": "support"}'])
    parser = JsonOutputParser()

    @RunnableLambda
    def lookup(ticket):
        calls["lookup"] += 1
        return f"Ticket: {ticket}\nAvailable queues: billing, support."

    @RunnableLambda
    def model(context):
        calls["model"] += 1
        return next(replies)

    @RunnableLambda
    def parse(text):
        calls["parse"] += 1
        return parser.invoke(text)

    chains = {
        "parser": lookup | model | parse.with_retry(**retry),
        "whole": (lookup | model | parse).with_retry(**retry),
        "pair": lookup | (model | parse).with_retry(**retry),
    }
    try:
        result = chains[scope].invoke("Exported PDF does not open.")["queue"]
    except OutputParserException as exc:
        result = type(exc).__name__
    print(f"{scope:6} lookup={calls['lookup']} model={calls['model']} "
          f"parse={calls['parse']} -> {result}")


if __name__ == "__main__":
    for case in ("parser", "whole", "pair"):
        run(case)

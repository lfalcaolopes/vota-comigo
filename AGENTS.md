## Testing

- Tests describe **behavior**, not implementation. Renaming a variable or extracting a method must never break a test.
- Group tests by scenario using nested `describe`, not by method name.
- Use AAA pattern (Arrange/Act/Assert) with section comments.
- Mock only external dependencies. Never mock the unit under test.
- Unit tests must not touch real databases, network, or other modules.
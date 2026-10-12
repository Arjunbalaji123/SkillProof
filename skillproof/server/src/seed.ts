import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface SeedQuestion {
  language: string;
  topic: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  type: 'MCQ' | 'MULTI' | 'CODE_OUTPUT';
  prompt: string;
  options: string[];
  correctAnswer: string[];
  explanation: string;
}

const sampleQuestions: SeedQuestion[] = [
  // ==========================================
  // JAVASCRIPT QUESTIONS (22 Questions: 9 Easy, 9 Medium, 4 Hard)
  // ==========================================
  // Easy (1-9)
  {
    language: 'JavaScript',
    topic: 'Data Types',
    difficulty: 'EASY',
    type: 'MCQ',
    prompt: 'What does the expression `typeof NaN` evaluate to in JavaScript?',
    options: ['"number"', '"nan"', '"undefined"', '"object"'],
    correctAnswer: ['"number"'],
    explanation: 'In JavaScript, NaN is a numeric value representing Not-a-Number, so typeof NaN evaluates to "number".',
  },
  {
    language: 'JavaScript',
    topic: 'Scope',
    difficulty: 'EASY',
    type: 'MCQ',
    prompt: 'Which keyword declares a variable with block scope that cannot be reassigned?',
    options: ['const', 'let', 'var', 'def'],
    correctAnswer: ['const'],
    explanation: 'const creates a block-scoped binding that cannot be reassigned after declaration.',
  },
  {
    language: 'JavaScript',
    topic: 'Equality',
    difficulty: 'EASY',
    type: 'CODE_OUTPUT',
    prompt: 'What is the output of the following code?\n```js\nconsole.log(0 == false, 0 === false);\n```',
    options: ['true false', 'true true', 'false false', 'false true'],
    correctAnswer: ['true false'],
    explanation: 'Loose equality (==) coerces false to 0, returning true. Strict equality (===) checks type and returns false.',
  },
  {
    language: 'JavaScript',
    topic: 'Arrays',
    difficulty: 'EASY',
    type: 'MCQ',
    prompt: 'Which Array method creates a new array with all elements that pass the test implemented by the provided function?',
    options: ['filter()', 'map()', 'reduce()', 'forEach()'],
    correctAnswer: ['filter()'],
    explanation: 'Array.prototype.filter() returns a shallow copy containing only elements that return truthy for the predicate.',
  },
  {
    language: 'JavaScript',
    topic: 'Objects',
    difficulty: 'EASY',
    type: 'CODE_OUTPUT',
    prompt: 'What is the output of:\n```js\nconst a = { x: 1 };\nconst b = a;\nb.x = 2;\nconsole.log(a.x);\n```',
    options: ['2', '1', 'undefined', 'ReferenceError'],
    correctAnswer: ['2'],
    explanation: 'Objects in JavaScript are assigned by reference, so mutating `b` mutates the same underlying object referenced by `a`.',
  },
  {
    language: 'JavaScript',
    topic: 'Strings',
    difficulty: 'EASY',
    type: 'MCQ',
    prompt: 'Which syntax represents an ES6 Template Literal?',
    options: ['`Hello ${name}`', '"Hello " + name', "'Hello ${name}'", '(Hello $name)'],
    correctAnswer: ['`Hello ${name}`'],
    explanation: 'Template literals use backticks (``) and allow embedded expressions using ${expression}.',
  },
  {
    language: 'JavaScript',
    topic: 'Functions',
    difficulty: 'EASY',
    type: 'MCQ',
    prompt: 'How do arrow functions treat the `this` keyword compared to regular functions?',
    options: [
      'They inherit `this` lexically from their enclosing scope',
      'They bind `this` to the global object always',
      'They define their own `this` based on invocation caller',
      'They do not allow accessing `this` at all',
    ],
    correctAnswer: ['They inherit `this` lexically from their enclosing scope'],
    explanation: 'Arrow functions do not have their own `this` binding; they retain the `this` value of the enclosing lexical execution context.',
  },
  {
    language: 'JavaScript',
    topic: 'JSON',
    difficulty: 'EASY',
    type: 'MCQ',
    prompt: 'Which method converts a JavaScript object into a JSON string?',
    options: ['JSON.stringify()', 'JSON.parse()', 'JSON.toString()', 'Object.toJSON()'],
    correctAnswer: ['JSON.stringify()'],
    explanation: 'JSON.stringify() serializes JavaScript values to valid JSON strings.',
  },
  {
    language: 'JavaScript',
    topic: 'Destructuring',
    difficulty: 'EASY',
    type: 'CODE_OUTPUT',
    prompt: 'What is the output of:\n```js\nconst [x = 5, y = 7] = [10];\nconsole.log(x, y);\n```',
    options: ['10 7', '5 7', '10 undefined', 'undefined 7'],
    correctAnswer: ['10 7'],
    explanation: 'x is assigned the value 10 from the array. Since the second element is undefined, y uses its default value 7.',
  },
  // Medium (10-17)
  {
    language: 'JavaScript',
    topic: 'Closures',
    difficulty: 'MEDIUM',
    type: 'CODE_OUTPUT',
    prompt: 'What is the output of the following code?\n```js\nfunction makeCounter() {\n  let count = 0;\n  return () => ++count;\n}\nconst c1 = makeCounter();\nconst c2 = makeCounter();\nconsole.log(c1(), c1(), c2());\n```',
    options: ['1 2 1', '1 2 3', '1 1 1', '0 1 0'],
    correctAnswer: ['1 2 1'],
    explanation: 'Each call to makeCounter creates an independent closure with its own isolated lexical environment for `count`.',
  },
  {
    language: 'JavaScript',
    topic: 'Event Loop',
    difficulty: 'MEDIUM',
    type: 'CODE_OUTPUT',
    prompt: 'What order will these statements print?\n```js\nconsole.log("A");\nsetTimeout(() => console.log("B"), 0);\nPromise.resolve().then(() => console.log("C"));\nconsole.log("D");\n```',
    options: ['A D C B', 'A B C D', 'A D B C', 'C A D B'],
    correctAnswer: ['A D C B'],
    explanation: 'Synchronous statements run first (A, D). Microtasks (Promise then callbacks) run before macrotasks (setTimeout callbacks), so C prints then B.',
  },
  {
    language: 'JavaScript',
    topic: 'Prototypes',
    difficulty: 'MEDIUM',
    type: 'MCQ',
    prompt: 'Where does JavaScript look for a property when it is not found directly on an object?',
    options: [
      'Up the object prototype chain via `__proto__` / `Object.getPrototypeOf()`',
      'In the global window/global scope',
      'In the constructor function arguments',
      'Inside the nearest enclosing lexical closure',
    ],
    correctAnswer: ['Up the object prototype chain via `__proto__` / `Object.getPrototypeOf()`'],
    explanation: 'Property resolution walks up the prototype chain until the property is found or `null` is reached.',
  },
  {
    language: 'JavaScript',
    topic: 'Async / Await',
    difficulty: 'MEDIUM',
    type: 'CODE_OUTPUT',
    prompt: 'What does this function return?\n```js\nasync function test() {\n  return 42;\n}\nconsole.log(test() instanceof Promise);\n```',
    options: ['true', 'false', 'TypeError', 'undefined'],
    correctAnswer: ['true'],
    explanation: 'Async functions always wrap their return value in a resolved Promise.',
  },
  {
    language: 'JavaScript',
    topic: 'Arrays',
    difficulty: 'MEDIUM',
    type: 'CODE_OUTPUT',
    prompt: 'What does `[1, 2, 3].reduce((acc, n) => acc + n, 10)` evaluate to?',
    options: ['16', '6', '10', '15'],
    correctAnswer: ['16'],
    explanation: 'Initial accumulator is 10. 10 + 1 = 11, 11 + 2 = 13, 13 + 3 = 16.',
  },
  {
    language: 'JavaScript',
    topic: 'Rest & Spread',
    difficulty: 'MEDIUM',
    type: 'MULTI',
    prompt: 'Which of the following are valid uses of the spread operator (`...`)? (Select all that apply)',
    options: [
      'Shallow copying an array: `[...arr]`',
      'Merging two objects: `{ ...objA, ...objB }`',
      'Spreading function arguments: `Math.max(...nums)`',
      'Defining a function parameter list rest collection: `function f(...args)`',
    ],
    correctAnswer: [
      'Shallow copying an array: `[...arr]`',
      'Merging two objects: `{ ...objA, ...objB }`',
      'Spreading function arguments: `Math.max(...nums)`',
    ],
    explanation: 'The spread syntax expands iterables/objects. Note that `function f(...args)` uses rest syntax, though both use the triple-dot token.',
  },
  {
    language: 'JavaScript',
    topic: 'Coercion',
    difficulty: 'MEDIUM',
    type: 'CODE_OUTPUT',
    prompt: 'What does `"5" - 3 + "2"` output in JavaScript?',
    options: ['"22"', '4', '"532"', 'NaN'],
    correctAnswer: ['"22"'],
    explanation: '"5" - 3 converts "5" to a number, yielding 2. Then 2 + "2" performs string concatenation, resulting in "22".',
  },
  {
    language: 'JavaScript',
    topic: 'Hoisting',
    difficulty: 'MEDIUM',
    type: 'CODE_OUTPUT',
    prompt: 'What happens when executing:\n```js\nconsole.log(a);\nvar a = 10;\n```',
    options: ['Prints `undefined`', 'Throws ReferenceError', 'Prints `10`', 'Throws TypeError'],
    correctAnswer: ['Prints `undefined`'],
    explanation: '`var` declarations are hoisted and initialized to `undefined`. `let` and `const` would throw a ReferenceError due to the Temporal Dead Zone.',
  },
  // Hard (18-21)
  {
    language: 'JavaScript',
    topic: 'Memory & Garbage Collection',
    difficulty: 'HARD',
    type: 'MCQ',
    prompt: 'What is the main difference between `Map` and `WeakMap` in JavaScript?',
    options: [
      'WeakMap keys must be objects and do not prevent garbage collection of their keys',
      'WeakMap values are weakly referenced while keys are strongly referenced',
      'WeakMap supports iteration over keys with for..of, whereas Map does not',
      'WeakMap has guaranteed deterministic key order while Map does not',
    ],
    correctAnswer: ['WeakMap keys must be objects and do not prevent garbage collection of their keys'],
    explanation: 'WeakMap keys must be objects/symbols and hold weak references, allowing keys to be garbage-collected if no other references exist.',
  },
  {
    language: 'JavaScript',
    topic: 'Event Loop & Tasks',
    difficulty: 'HARD',
    type: 'CODE_OUTPUT',
    prompt: 'What will be printed?\n```js\nlet x = 0;\nasync function f() {\n  x += await 2;\n  console.log(x);\n}\nf();\nx += 1;\nconsole.log(x);\n```',
    options: ['1 then 2', '1 then 3', '2 then 1', '3 then 2'],
    correctAnswer: ['1 then 2'],
    explanation: '`x += await 2` evaluates `x + await 2`. The left-hand side `x` is evaluated before awaiting (which is 0). `f()` pauses. Synchronously `x += 1` executes making x=1 and printing 1. When `f()` resumes, it executes `0 + 2 = 2`, assigns to x and prints 2.',
  },
  {
    language: 'JavaScript',
    topic: 'Proxy & Reflection',
    difficulty: 'HARD',
    type: 'MCQ',
    prompt: 'Which Proxy trap intercepts object property access (e.g. `obj.prop`)?',
    options: ['get', 'has', 'apply', 'set'],
    correctAnswer: ['get'],
    explanation: 'The `get` trap intercepts property lookups on proxy target objects.',
  },
  {
    language: 'JavaScript',
    topic: 'Generators',
    difficulty: 'HARD',
    type: 'CODE_OUTPUT',
    prompt: 'What is the output of:\n```js\nfunction* gen() {\n  const x = yield 10;\n  yield x * 2;\n}\nconst g = gen();\nconsole.log(g.next().value, g.next(5).value);\n```',
    options: ['10 10', '10 20', 'undefined 10', '10 NaN'],
    correctAnswer: ['10 10'],
    explanation: 'First `next()` runs up to `yield 10`, yielding value 10. Second `next(5)` passes 5 into the paused expression, so `x = 5`, and `yield 5 * 2` yields 10.',
  },

  // ==========================================
  // PYTHON QUESTIONS (21 Questions: 9 Easy, 8 Medium, 4 Hard)
  // ==========================================
  // Easy (1-9)
  {
    language: 'Python',
    topic: 'Data Types',
    difficulty: 'EASY',
    type: 'MCQ',
    prompt: 'Which built-in Python collection type is immutable?',
    options: ['tuple', 'list', 'dict', 'set'],
    correctAnswer: ['tuple'],
    explanation: 'Tuples are immutable sequences in Python; their elements cannot be modified or reassigned after creation.',
  },
  {
    language: 'Python',
    topic: 'Strings',
    difficulty: 'EASY',
    type: 'CODE_OUTPUT',
    prompt: 'What is the output of `print("Python"[::-1])`?',
    options: ['nohtyP', 'Python', 'P', 'IndexError'],
    correctAnswer: ['nohtyP'],
    explanation: 'Slice notation `[::-1]` reverses the sequence.',
  },
  {
    language: 'Python',
    topic: 'Lists',
    difficulty: 'EASY',
    type: 'CODE_OUTPUT',
    prompt: 'What does this print?\n```python\nnums = [1, 2, 3]\nnums.append([4, 5])\nprint(len(nums))\n```',
    options: ['4', '5', '3', 'TypeError'],
    correctAnswer: ['4'],
    explanation: '`append()` inserts its argument as a single element, so the list becomes `[1, 2, 3, [4, 5]]` with length 4. (To flatten, `extend()` would be used).',
  },
  {
    language: 'Python',
    topic: 'Dictionaries',
    difficulty: 'EASY',
    type: 'MCQ',
    prompt: 'Which method returns a dictionary value safely without raising a KeyError if the key is missing?',
    options: ['dict.get(key, default)', 'dict.fetch(key)', 'dict.find(key)', 'dict.lookup(key)'],
    correctAnswer: ['dict.get(key, default)'],
    explanation: 'dict.get(key, default) returns None (or the specified default) instead of raising a KeyError if the key does not exist.',
  },
  {
    language: 'Python',
    topic: 'Control Flow',
    difficulty: 'EASY',
    type: 'CODE_OUTPUT',
    prompt: 'What is the output of:\n```python\nfor i in range(2, 5):\n    print(i, end=" ")\n```',
    options: ['2 3 4 ', '2 3 4 5 ', '0 1 2 3 4 ', '3 4 5 '],
    correctAnswer: ['2 3 4 '],
    explanation: '`range(start, stop)` is half-open: includes start (2) and stops before stop (5), generating 2, 3, 4.',
  },
  {
    language: 'Python',
    topic: 'Booleans',
    difficulty: 'EASY',
    type: 'MCQ',
    prompt: 'Which of the following values evaluates to `False` in a boolean context in Python?',
    options: ['[] (empty list)', '[0]', '" "', '(-1,)'],
    correctAnswer: ['[] (empty list)'],
    explanation: 'Empty sequences and collections (such as `[]`, `()`, `{}`, `""`) evaluate to False in Python.',
  },
  {
    language: 'Python',
    topic: 'Functions',
    difficulty: 'EASY',
    type: 'MCQ',
    prompt: 'What keyword defines an anonymous inline function in Python?',
    options: ['lambda', 'def', 'anon', 'fn'],
    correctAnswer: ['lambda'],
    explanation: 'The `lambda` keyword defines small anonymous functions in Python.',
  },
  {
    language: 'Python',
    topic: 'Sets',
    difficulty: 'EASY',
    type: 'CODE_OUTPUT',
    prompt: 'What is the output of:\n```python\nprint(set([1, 2, 2, 3, 1]))\n```',
    options: ['{1, 2, 3}', '[1, 2, 3]', '{1, 2, 2, 3, 1}', '(1, 2, 3)'],
    correctAnswer: ['{1, 2, 3}'],
    explanation: 'Sets enforce uniqueness and eliminate duplicate elements.',
  },
  {
    language: 'Python',
    topic: 'Comprehensions',
    difficulty: 'EASY',
    type: 'CODE_OUTPUT',
    prompt: 'What does `[x*2 for x in range(3)]` produce?',
    options: ['[0, 2, 4]', '[2, 4, 6]', '[0, 1, 2]', '(0, 2, 4)'],
    correctAnswer: ['[0, 2, 4]'],
    explanation: 'range(3) produces 0, 1, 2. Multiplying each by 2 yields `[0, 2, 4]`.',
  },
  // Medium (10-17)
  {
    language: 'Python',
    topic: 'Mutability & Arguments',
    difficulty: 'MEDIUM',
    type: 'CODE_OUTPUT',
    prompt: 'What does this code print?\n```python\ndef add_item(item, lst=[]):\n    lst.append(item)\n    return lst\n\nprint(add_item(1))\nprint(add_item(2))\n```',
    options: ['[1] then [1, 2]', '[1] then [2]', '[1] then []', 'TypeError'],
    correctAnswer: ['[1] then [1, 2]'],
    explanation: 'Default argument expressions in Python are evaluated once at function definition time, so the mutable list is shared across calls.',
  },
  {
    language: 'Python',
    topic: 'Decorators',
    difficulty: 'MEDIUM',
    type: 'MCQ',
    prompt: 'What is the primary role of `functools.wraps` when writing custom Python decorators?',
    options: [
      'It preserves the original function docstring, name, and metadata',
      'It enforces thread safety on the decorated function',
      'It automatically caches function return values',
      'It converts synchronous functions into coroutines',
    ],
    correctAnswer: ['It preserves the original function docstring, name, and metadata'],
    explanation: 'functools.wraps copies name, docstring, and annotations from the wrapped function to the wrapper function.',
  },
  {
    language: 'Python',
    topic: 'Generators',
    difficulty: 'MEDIUM',
    type: 'MCQ',
    prompt: 'Which statement immediately pauses a generator function and yields a value back to the caller?',
    options: ['yield', 'return', 'pass', 'suspend'],
    correctAnswer: ['yield'],
    explanation: 'The `yield` statement yields execution and state back to the caller while saving function stack position.',
  },
  {
    language: 'Python',
    topic: 'OOP & Dunder',
    difficulty: 'MEDIUM',
    type: 'MCQ',
    prompt: 'Which special dunder method defines string formatting for end-users when calling `str(obj)`?',
    options: ['__str__', '__repr__', '__format__', '__text__'],
    correctAnswer: ['__str__'],
    explanation: '__str__ returns an informal, readable string representation for str() and print().',
  },
  {
    language: 'Python',
    topic: 'Scope',
    difficulty: 'MEDIUM',
    type: 'CODE_OUTPUT',
    prompt: 'What is the output of:\n```python\nx = 10\ndef f():\n    global x\n    x = 20\nf()\nprint(x)\n```',
    options: ['20', '10', 'UnboundLocalError', 'None'],
    correctAnswer: ['20'],
    explanation: 'The `global x` statement binds the name `x` in function scope directly to the global module namespace.',
  },
  {
    language: 'Python',
    topic: 'Collections',
    difficulty: 'MEDIUM',
    type: 'CODE_OUTPUT',
    prompt: 'What is the output of:\n```python\nfrom collections import defaultdict\nd = defaultdict(int)\nd["a"] += 5\nprint(d["b"], d["a"])\n```',
    options: ['0 5', 'KeyError 5', 'None 5', '5 0'],
    correctAnswer: ['0 5'],
    explanation: 'defaultdict(int) initializes missing keys to `int()`, which is 0.',
  },
  {
    language: 'Python',
    topic: 'Packing & Unpacking',
    difficulty: 'MEDIUM',
    type: 'CODE_OUTPUT',
    prompt: 'What is the output of:\n```python\na, *b, c = [1, 2, 3, 4, 5]\nprint(b)\n```',
    options: ['[2, 3, 4]', '[1, 2, 3]', '[3, 4, 5]', '(2, 3, 4)'],
    correctAnswer: ['[2, 3, 4]'],
    explanation: 'Extended unpacking captures middle elements into list `b` between the head `a` (1) and tail `c` (5).',
  },
  {
    language: 'Python',
    topic: 'Context Managers',
    difficulty: 'MEDIUM',
    type: 'MCQ',
    prompt: 'Which two dunder methods must a class implement to support the `with` statement protocol?',
    options: ['__enter__ and __exit__', '__start__ and __stop__', '__open__ and __close__', '__init__ and __del__'],
    correctAnswer: ['__enter__ and __exit__'],
    explanation: 'The context manager protocol requires `__enter__()` and `__exit__(exc_type, exc_val, exc_tb)`.',
  },
  // Hard (18-21)
  {
    language: 'Python',
    topic: 'GIL & Concurrency',
    difficulty: 'HARD',
    type: 'MCQ',
    prompt: 'How does CPython Global Interpreter Lock (GIL) affect multithreading in CPU-bound Python programs?',
    options: [
      'It prevents multiple native OS threads from executing Python bytecode simultaneously on multiple cores',
      'It automatically parallelizes CPU-bound loops across all available CPU threads',
      'It disables asynchronous I/O and networking entirely',
      'It prevents multi-processing processes from spawning',
    ],
    correctAnswer: ['It prevents multiple native OS threads from executing Python bytecode simultaneously on multiple cores'],
    explanation: 'The GIL ensures only one thread executes CPython bytecode at any given moment, limiting CPU-bound speedup across multiple CPU cores without multiprocessing.',
  },
  {
    language: 'Python',
    topic: 'Metaclasses',
    difficulty: 'HARD',
    type: 'MCQ',
    prompt: 'In Python, what is the default type/metaclass of user-defined classes?',
    options: ['type', 'object', 'ClassType', 'Meta'],
    correctAnswer: ['type'],
    explanation: 'In Python, classes are instances of the metaclass `type`.',
  },
  {
    language: 'Python',
    topic: 'Descriptors',
    difficulty: 'HARD',
    type: 'MCQ',
    prompt: 'Which method combination characterizes a Python "data descriptor"?',
    options: [
      'A class defining `__set__` and/or `__delete__` in addition to `__get__`',
      'A class defining only `__get__`',
      'A class with `@property` without a setter',
      'A class defining `__getattr__` and `__setattr__`',
    ],
    correctAnswer: ['A class defining `__set__` and/or `__delete__` in addition to `__get__`'],
    explanation: 'Descriptors defining `__set__` or `__delete__` are data descriptors, which take precedence over instance dictionary lookup.',
  },
  {
    language: 'Python',
    topic: 'Memory & Garbage Collection',
    difficulty: 'HARD',
    type: 'MCQ',
    prompt: 'How does Python handle memory management and cyclic reference cleanup?',
    options: [
      'Reference counting as the primary mechanism, supplemented by a generational cyclic garbage collector',
      'Strict mark-and-sweep garbage collection only with no reference counting',
      'Deterministic manual memory pooling without garbage collection',
      'Stack allocation exclusively for all complex objects',
    ],
    correctAnswer: ['Reference counting as the primary mechanism, supplemented by a generational cyclic garbage collector'],
    explanation: 'CPython relies primarily on reference counting for immediate deallocation, paired with a generational GC to identify reference cycles.',
  },

  // ==========================================
  // JAVA QUESTIONS (21 Questions: 9 Easy, 8 Medium, 4 Hard)
  // ==========================================
  // Easy (1-9)
  {
    language: 'Java',
    topic: 'Data Types',
    difficulty: 'EASY',
    type: 'MCQ',
    prompt: 'What is the default value of a boolean primitive variable as a class member in Java?',
    options: ['false', 'true', 'null', '0'],
    correctAnswer: ['false'],
    explanation: 'Instance and static primitive boolean variables default to false in Java.',
  },
  {
    language: 'Java',
    topic: 'Strings',
    difficulty: 'EASY',
    type: 'MCQ',
    prompt: 'Which class should be used when extensive string modifications are required in a single-threaded environment without synchronization overhead?',
    options: ['StringBuilder', 'StringBuffer', 'String', 'StringTokenizer'],
    correctAnswer: ['StringBuilder'],
    explanation: 'StringBuilder is mutable and unsynchronized, making it faster than the thread-safe StringBuffer.',
  },
  {
    language: 'Java',
    topic: 'OOP',
    difficulty: 'EASY',
    type: 'MCQ',
    prompt: 'Which keyword in Java prevents a class from being inherited/subclassed?',
    options: ['final', 'static', 'abstract', 'private'],
    correctAnswer: ['final'],
    explanation: 'Applying `final` to a class declaration prevents other classes from extending it.',
  },
  {
    language: 'Java',
    topic: 'Interfaces',
    difficulty: 'EASY',
    type: 'MCQ',
    prompt: 'Can a class in Java implement multiple interfaces?',
    options: ['Yes, a class can implement any number of interfaces', 'No, Java only allows single interface implementation', 'Only if all interfaces have no methods', 'Only if the class is abstract'],
    correctAnswer: ['Yes, a class can implement any number of interfaces'],
    explanation: 'Java supports multiple interface inheritance via the `implements` keyword.',
  },
  {
    language: 'Java',
    topic: 'Equality',
    difficulty: 'EASY',
    type: 'CODE_OUTPUT',
    prompt: 'What is the output of:\n```java\nString s1 = new String("Java");\nString s2 = new String("Java");\nSystem.out.println(s1 == s2);\n```',
    options: ['false', 'true', 'Compilation error', 'NullPointerException'],
    correctAnswer: ['false'],
    explanation: 'The `==` operator compares object references. `new String(...)` allocates distinct objects in memory.',
  },
  {
    language: 'Java',
    topic: 'Arrays',
    difficulty: 'EASY',
    type: 'CODE_OUTPUT',
    prompt: 'What is printed by:\n```java\nint[] arr = new int[3];\nSystem.out.println(arr[0]);\n```',
    options: ['0', 'null', 'undefined', 'Garbage value'],
    correctAnswer: ['0'],
    explanation: 'Java automatically initializes integer array elements to 0 upon allocation.',
  },
  {
    language: 'Java',
    topic: 'Access Modifiers',
    difficulty: 'EASY',
    type: 'MCQ',
    prompt: 'Which access modifier allows access within the same package and by subclasses in other packages?',
    options: ['protected', 'package-private (default)', 'public', 'private'],
    correctAnswer: ['protected'],
    explanation: '`protected` members are accessible within their package and by subclasses across packages.',
  },
  {
    language: 'Java',
    topic: 'Collections',
    difficulty: 'EASY',
    type: 'MCQ',
    prompt: 'Which Collection interface does NOT allow duplicate elements?',
    options: ['Set', 'List', 'Queue', 'ArrayList'],
    correctAnswer: ['Set'],
    explanation: 'The `Set` interface models a mathematical set containing no duplicate elements.',
  },
  {
    language: 'Java',
    topic: 'Keywords',
    difficulty: 'EASY',
    type: 'MCQ',
    prompt: 'Which keyword refers to the direct superclass constructor in Java?',
    options: ['super()', 'this()', 'parent()', 'base()'],
    correctAnswer: ['super()'],
    explanation: '`super()` invokes the constructor of the parent class.',
  },
  // Medium (10-17)
  {
    language: 'Java',
    topic: 'Collections & Maps',
    difficulty: 'MEDIUM',
    type: 'MCQ',
    prompt: 'What contract must be maintained between `equals()` and `hashCode()` in Java?',
    options: [
      'If two objects are equal according to `equals()`, they must produce the same `hashCode()`',
      'If two objects have the same `hashCode()`, they must be equal according to `equals()`',
      'Both must return primitive integers',
      'Overriding `equals()` does not require overriding `hashCode()`',
    ],
    correctAnswer: ['If two objects are equal according to `equals()`, they must produce the same `hashCode()`'],
    explanation: 'The Object contract requires that equal objects must have identical hash codes to function correctly in hash-based collections like HashMap and HashSet.',
  },
  {
    language: 'Java',
    topic: 'Streams API',
    difficulty: 'MEDIUM',
    type: 'CODE_OUTPUT',
    prompt: 'What is the output of:\n```java\nList<Integer> list = List.of(1, 2, 3, 4);\nlong count = list.stream().filter(n -> n % 2 == 0).count();\nSystem.out.println(count);\n```',
    options: ['2', '4', '1', '3'],
    correctAnswer: ['2'],
    explanation: 'The filter retains even numbers [2, 4], and `count()` returns 2.',
  },
  {
    language: 'Java',
    topic: 'Generics',
    difficulty: 'MEDIUM',
    type: 'MCQ',
    prompt: 'What is "type erasure" in Java Generics?',
    options: [
      'The process where the compiler removes generic type parameters during compilation for backward compatibility',
      'A runtime error when casting generic collections',
      'Removing primitive types from JVM memory',
      'Disabling type safety checks in reflection',
    ],
    correctAnswer: ['The process where the compiler removes generic type parameters during compilation for backward compatibility'],
    explanation: 'Java generics use type erasure: parameterized types are checked at compile time and replaced with their bounds or Object in bytecode.',
  },
  {
    language: 'Java',
    topic: 'Exceptions',
    difficulty: 'MEDIUM',
    type: 'MCQ',
    prompt: 'Which class is the root for all checked exceptions in Java (excluding RuntimeException)?',
    options: ['java.lang.Exception', 'java.lang.Throwable', 'java.lang.Error', 'java.lang.RuntimeException'],
    correctAnswer: ['java.lang.Exception'],
    explanation: 'Checked exceptions inherit directly from `java.lang.Exception` (excluding subclasses of `RuntimeException`).',
  },
  {
    language: 'Java',
    topic: 'Threading',
    difficulty: 'MEDIUM',
    type: 'MCQ',
    prompt: 'What does the `volatile` keyword guarantee when applied to a variable in Java?',
    options: [
      'Visibility of changes across threads (reads/writes directly to main memory)',
      'Atomicity of compound operations like incrementing (`count++`)',
      'Exclusive lock acquisition on the variable',
      'Deadlock prevention automatically',
    ],
    correctAnswer: ['Visibility of changes across threads (reads/writes directly to main memory)'],
    explanation: '`volatile` ensures CPU cache coherency and visibility across threads, but does not guarantee atomicity for compound operations.',
  },
  {
    language: 'Java',
    topic: 'Optional',
    difficulty: 'MEDIUM',
    type: 'CODE_OUTPUT',
    prompt: 'What is the output of:\n```java\nOptional<String> opt = Optional.ofNullable(null);\nSystem.out.println(opt.orElse("Fallback"));\n```',
    options: ['Fallback', 'null', 'NullPointerException', 'Optional.empty'],
    correctAnswer: ['Fallback'],
    explanation: '`Optional.ofNullable(null)` returns an empty Optional, and `orElse("Fallback")` provides the default value.',
  },
  {
    language: 'Java',
    topic: 'Polymorphism',
    difficulty: 'MEDIUM',
    type: 'CODE_OUTPUT',
    prompt: 'What is the output of:\n```java\nclass A { void show() { System.out.print("A"); } }\nclass B extends A { void show() { System.out.print("B"); } }\nA obj = new B();\nobj.show();\n```',
    options: ['B', 'A', 'Compilation Error', 'Runtime Error'],
    correctAnswer: ['B'],
    explanation: 'Dynamic method dispatch in Java invokes the overridden method on the actual runtime object instance `B`.',
  },
  {
    language: 'Java',
    topic: 'Functional Interfaces',
    difficulty: 'MEDIUM',
    type: 'MCQ',
    prompt: 'What constitutes a Functional Interface in Java?',
    options: [
      'An interface containing exactly one abstract method',
      'Any interface annotated with `@FunctionalInterface` regardless of methods',
      'An interface with only default methods',
      'An interface that cannot have static methods',
    ],
    correctAnswer: ['An interface containing exactly one abstract method'],
    explanation: 'A functional interface specifies exactly one abstract method (Single Abstract Method - SAM).',
  },
  // Hard (18-21)
  {
    language: 'Java',
    topic: 'JVM & Memory Management',
    difficulty: 'HARD',
    type: 'MCQ',
    prompt: 'Where are string literals allocated in modern Java (Java 8+)?',
    options: [
      'Inside the String Constant Pool located in the Java Heap memory',
      'In PermGen memory',
      'In native C stack memory',
      'In thread-local registers only',
    ],
    correctAnswer: ['Inside the String Constant Pool located in the Java Heap memory'],
    explanation: 'Since Java 7/8, the String Constant Pool resides directly inside the main Java Heap (PermGen was replaced with Metaspace).',
  },
  {
    language: 'Java',
    topic: 'Concurrency & Locks',
    difficulty: 'HARD',
    type: 'MCQ',
    prompt: 'What is the key advantage of `ReentrantLock` over the standard `synchronized` keyword block?',
    options: [
      'Ability to try-lock with timeouts, interruptible locking, and fairness policies',
      'Higher memory safety with zero garbage collection',
      'Automatic multi-core thread scaling without context switching',
      'Guaranteed deadlock-free code execution',
    ],
    correctAnswer: ['Ability to try-lock with timeouts, interruptible locking, and fairness policies'],
    explanation: 'ReentrantLock offers advanced synchronization: `tryLock()`, timed wait, fairness configuration, and multiple Condition objects.',
  },
  {
    language: 'Java',
    topic: 'ClassLoaders',
    difficulty: 'HARD',
    type: 'MCQ',
    prompt: 'What delegation model do standard Java ClassLoaders follow when loading a class?',
    options: [
      'Parent-first delegation: requests are forwarded up to the parent loader before searching locally',
      'Child-first delegation: classes are always loaded by child loader first',
      'Round-robin thread pool delegation',
      'Direct disk scanning bypassing parents',
    ],
    correctAnswer: ['Parent-first delegation: requests are forwarded up to the parent loader before searching locally'],
    explanation: 'Java class loaders follow parent delegation: a loader first asks its parent to load the class before attempting to find it locally.',
  },
  {
    language: 'Java',
    topic: 'Memory Model (JMM)',
    difficulty: 'HARD',
    type: 'MCQ',
    prompt: 'In the Java Memory Model, what is the significance of the "happens-before" relationship?',
    options: [
      'It guarantees that memory writes by one thread are visible to another thread in a defined order',
      'It ensures faster CPU clock execution speed',
      'It prevents objects from ever escaping the heap',
      'It guarantees that garbage collection runs before thread termination',
    ],
    correctAnswer: ['It guarantees that memory writes by one thread are visible to another thread in a defined order'],
    explanation: 'A happens-before relationship between two operations guarantees that the memory writes of the first are visible to the second.',
  },
];

async function main() {
  console.log('🌱 Starting SkillProof v2 database seed...');

  // 1. Hash passwords
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const recruiterPasswordHash = await bcrypt.hash('Recruiter@123', 10);
  const devPasswordHash = await bcrypt.hash('Dev@123', 10);

  // 2. Create Admin User
  const admin = await prisma.user.create({
    data: {
      name: 'Admin Director',
      email: 'admin@skillproof.dev',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  // 3. Create Recruiter User
  const recruiter = await prisma.user.create({
    data: {
      name: 'Sarah Jenkins',
      email: 'recruiter@techcorp.com',
      passwordHash: recruiterPasswordHash,
      role: 'RECRUITER',
      status: 'ACTIVE',
    },
  });

  // 4. Create Developer 1 (Arjun Balaji)
  const dev1 = await prisma.user.create({
    data: {
      name: 'Arjun Balaji',
      email: 'arjun@skillproof.dev',
      passwordHash: devPasswordHash,
      role: 'DEVELOPER',
      status: 'ACTIVE',
      profile: {
        create: {
          bio: 'Full-Stack Engineer with 5+ years experience building distributed backends, microservices, and React frontends. Passionate about real, tested code over certificates.',
          githubUrl: 'https://github.com/arjunbalaji',
          publicSlug: 'arjun',
          isPublic: true,
        },
      },
    },
    include: { profile: true },
  });

  // 5. Create Developer 2 (Priya Sharma)
  const dev2 = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      email: 'priya@skillproof.dev',
      passwordHash: devPasswordHash,
      role: 'DEVELOPER',
      status: 'ACTIVE',
      profile: {
        create: {
          bio: 'Backend systems engineer specializing in Java, concurrency, and high-throughput streaming pipelines.',
          githubUrl: 'https://github.com/priyasharma',
          publicSlug: 'priyasharma',
          isPublic: true,
        },
      },
    },
    include: { profile: true },
  });

  // 6. Create Skills for Developer 1
  const arjunJs = await prisma.skill.create({
    data: {
      userId: dev1.id,
      language: 'JavaScript',
      claimedLevel: 'Advanced',
      status: 'VERIFIED',
      bestScore: 88,
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  const arjunPy = await prisma.skill.create({
    data: {
      userId: dev1.id,
      language: 'Python',
      claimedLevel: 'Expert',
      status: 'VERIFIED',
      bestScore: 92,
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.skill.create({
    data: {
      userId: dev1.id,
      language: 'Java',
      claimedLevel: 'Intermediate',
      certificateUrl: 'https://certificates.example.com/java-spring-arjun.pdf',
      status: 'CLAIMED',
    },
  });

  // 7. Create Skills for Developer 2
  await prisma.skill.create({
    data: {
      userId: dev2.id,
      language: 'Java',
      claimedLevel: 'Advanced',
      status: 'VERIFIED',
      bestScore: 84,
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.skill.create({
    data: {
      userId: dev2.id,
      language: 'Python',
      claimedLevel: 'Basic',
      certificateUrl: 'https://coursera.org/verify/python-intro-priya',
      status: 'CLAIMED',
    },
  });

  // 8. Create Projects
  await prisma.project.create({
    data: {
      userId: dev1.id,
      title: 'SkillProof Assessment Platform',
      description: 'Distributed test grading engine with server-side timing and randomized anti-cheat evaluation.',
      repoUrl: 'https://github.com/arjunbalaji/skillproof-engine',
      techStack: 'TypeScript, Node.js, Express, React, Prisma',
    },
  });

  await prisma.project.create({
    data: {
      userId: dev1.id,
      title: 'Real-time WebSocket Task Queue',
      description: 'Concurrency queue processing 40k events/sec with exponential backoff and Redis pub/sub.',
      repoUrl: 'https://github.com/arjunbalaji/distributed-queue',
      techStack: 'Node.js, Redis, Docker, TypeScript',
    },
  });

  await prisma.project.create({
    data: {
      userId: dev2.id,
      title: 'High-Concurrency JVM Financial Ledger',
      description: 'Double-entry bookkeeping engine with optimistic locking and sub-millisecond settlement.',
      repoUrl: 'https://github.com/priyasharma/jvm-ledger',
      techStack: 'Java 21, Spring Boot, PostgreSQL, Kafka',
    },
  });

  // 9. Create Recruiter Bookmark with note
  await prisma.bookmark.create({
    data: {
      recruiterId: recruiter.id,
      developerId: dev1.id,
      note: 'Verified JavaScript (88%) & Python (92%). Strong portfolio candidate for Senior Full-Stack role.',
    },
  });

  // 10. Seed Questions (64 questions across JavaScript, Python, Java)
  console.log(`📚 Inserting ${sampleQuestions.length} randomized test questions into Question Bank...`);
  for (const q of sampleQuestions) {
    const normalizedCorrect = Array.isArray(q.correctAnswer)
      ? q.correctAnswer.map(String)
      : [String(q.correctAnswer)];

    await prisma.question.create({
      data: {
        language: q.language,
        topic: q.topic,
        difficulty: q.difficulty,
        type: q.type,
        prompt: q.prompt,
        options: JSON.stringify(q.options),
        correctAnswer: JSON.stringify(normalizedCorrect),
        explanation: q.explanation,
        status: 'ACTIVE',
        createdBy: admin.id,
      },
    });
  }

  // 11. Initial Audit Log Entries
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'SYSTEM_SEED',
      entity: 'DATABASE',
      metadata: JSON.stringify({ questionsCount: sampleQuestions.length }),
    },
  });

  console.log('✅ SkillProof v2 database successfully seeded!');
  console.log('Credentials:');
  console.log('  Admin:     admin@skillproof.dev / Admin@123');
  console.log('  Recruiter: recruiter@techcorp.com / Recruiter@123');
  console.log('  Developer: arjun@skillproof.dev / Dev@123');
  console.log('  Developer: priya@skillproof.dev / Dev@123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

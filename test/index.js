/* global test, expect, jest */

const memoize = require('../src')

/* Class and decorator helpers from Babel */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
  var desc = {};
  Object['ke' + 'ys'](descriptor).forEach(function (key) {
    desc[key] = descriptor[key];
  });
  desc.enumerable = !!desc.enumerable;
  desc.configurable = !!desc.configurable;

  if ('value' in desc || desc.initializer) {
    desc.writable = true;
  }

  desc = decorators.slice().reverse().reduce(function (desc, decorator) {
    return decorator(target, property, desc) || desc;
  }, desc);

  if (context && desc.initializer !== void 0) {
    desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
    desc.initializer = undefined;
  }

  if (desc.initializer === void 0) {
    Object['define' + 'Property'](target, property, desc);
    desc = null;
  }

  return desc;
}

/* Tests */

test('speed', () => {
  // Vanilla Fibonacci

  function vanillaFibonacci (n) {
    return n < 2 ? n : vanillaFibonacci(n - 1) + vanillaFibonacci(n - 2)
  }

  const vanillaExecTimeStart = Date.now()
  vanillaFibonacci(35)
  const vanillaExecTime = Date.now() - vanillaExecTimeStart

  // Memoized

  let fibonacci = n => n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2)

  fibonacci = memoize(fibonacci)
  const memoizedFibonacci = fibonacci

  const memoizedExecTimeStart = Date.now()
  memoizedFibonacci(35)
  const memoizedExecTime = Date.now() - memoizedExecTimeStart

  // Assertion

  expect(memoizedExecTime < vanillaExecTime).toBe(true)
})

test('memoize functions with single primitive argument', () => {
  function plusPlus (number) {
    return number + 1
  }

  const memoizedPlusPlus = memoize(plusPlus)

  // Assertions

  expect(memoizedPlusPlus(1)).toBe(2)
  expect(memoizedPlusPlus(1)).toBe(2)
})

test('memoize functions with single non-primitive argument', () => {
  let numberOfCalls = 0
  function plusPlus (obj) {
    numberOfCalls += 1
    return obj.number + 1
  }

  const memoizedPlusPlus = memoize(plusPlus)

  // Assertions
  expect(memoizedPlusPlus({number: 1})).toBe(2)
  expect(numberOfCalls).toBe(1)
  expect(memoizedPlusPlus({number: 1})).toBe(2)
  expect(numberOfCalls).toBe(1)
})

test('memoize functions with N arguments', () => {
  function nToThePower (n, power) {
    return Math.pow(n, power)
  }

  const memoizedNToThePower = memoize(nToThePower)

  // Assertions

  expect(memoizedNToThePower(2, 3)).toBe(8)
  expect(memoizedNToThePower(2, 3)).toBe(8)
})

test('memoize functions with spread arguments', () => {
  function multiply (multiplier, ...theArgs) {
    return theArgs.map(function (element) {
      return multiplier * element
    })
  }

  const memoizedMultiply = memoize(multiply, {
    strategy: memoize.strategies.variadic
  })

  // Assertions

  expect(memoizedMultiply(2, 1, 2, 3)).toEqual([2, 4, 6])
  expect(memoizedMultiply(2, 4, 5, 6)).toEqual([8, 10, 12])
})

test('single arg primitive test', () => {
  function kindOf (arg) {
    return (arg && typeof arg === 'object' ? arg.constructor.name : typeof arg)
  }

  const memoizedKindOf = memoize(kindOf)

  // Assertions
  expect(memoizedKindOf(2)).toEqual('number')
  expect(memoizedKindOf('2')).toEqual('string')
})

test('inject custom cache', () => {
  let setMethodExecutionCount = 0

  // a custom cache instance must implement:
  // - has
  // - get
  // - set
  // - delete
  const customCacheProto = {
    has (key) {
      return (key in this.cache)
    },
    get (key) {
      return this.cache[key]
    },
    set (key, value) {
      setMethodExecutionCount++
      this.cache[key] = value
    },
    delete (key) {
      delete this.cache[key]
    }
  }
  const customCache = {
    create () {
      const cache = Object.create(customCacheProto)
      cache.cache = Object.create(null)
      return cache
    }
  }

  function minus (a, b) {
    return a - b
  }

  const memoizedMinus = memoize(minus, {
    cache: customCache
  })
  memoizedMinus(3, 1)
  memoizedMinus(3, 1)

  expect(setMethodExecutionCount).toBe(1)
})

test('inject custom serializer', () => {
  let serializerMethodExecutionCount = 0

  function serializer () {
    serializerMethodExecutionCount++
    return JSON.stringify(arguments)
  }

  function minus (a, b) {
    return a - b
  }

  const memoizedMinus = memoize(minus, {
    serializer
  })
  memoizedMinus(3, 1)
  memoizedMinus(3, 1)

  // Assertions

  expect(serializerMethodExecutionCount).toBe(2)
})

test('explicitly use exposed monadic strategy', () => {
  let numberOfCalls = 0
  function plusPlus (number) {
    numberOfCalls += 1
    return number + 1
  }
  const spy = jest.spyOn(memoize.strategies, 'monadic')
  const memoizedPlusPlus = memoize(plusPlus, { strategy: memoize.strategies.monadic })

  // Assertions
  expect(memoizedPlusPlus(1)).toBe(2)
  expect(numberOfCalls).toBe(1)
  expect(memoizedPlusPlus(1)).toBe(2)
  expect(numberOfCalls).toBe(1)
  expect(spy).toHaveBeenCalled()

  // Teardown
  spy.mockRestore()
})

test('explicitly use exposed variadic strategy', () => {
  let numberOfCalls = 0
  function plusPlus (number) {
    numberOfCalls += 1
    return number + 1
  }
  const spy = jest.spyOn(memoize.strategies, 'variadic')
  const memoizedPlusPlus = memoize(plusPlus, { strategy: memoize.strategies.variadic })

  // Assertions
  expect(memoizedPlusPlus(1)).toBe(2)
  expect(numberOfCalls).toBe(1)
  expect(memoizedPlusPlus(1)).toBe(2)
  expect(numberOfCalls).toBe(1)
  expect(spy).toHaveBeenCalled()

  // Teardown
  spy.mockRestore()
})

test('work as decorator', () => {
  let classA, classB, classC

  const spyB = jest.spyOn(memoize.strategies, 'variadic')
  const spyC = jest.spyOn(memoize.strategies, 'monadic')

  const decoA = memoize
  const decoB = memoize({ strategy: memoize.strategies.variadic })
  const decoC = memoize({ strategy: memoize.strategies.monadic })

  const A = (classA = function () {
    function A() {
      _classCallCheck(this, A);
    }
  
    _createClass(A, [{
      key: "method",
      value: function method() {
        return this.numberOfCalls = (this.numberOfCalls || 0) + 1;
      }
    }]);
  
    return A;
  }(), (
    _applyDecoratedDescriptor(
      classA.prototype,
      "method",
      [decoA],
      Object.getOwnPropertyDescriptor(classA.prototype, "method"),
      classA.prototype
    )
  ), classA);

  const B = (classB = function () {
    function B() {
      _classCallCheck(this, B);
    }
  
    _createClass(B, [{
      key: "method",
      value: function method() {
        return this.numberOfCalls = (this.numberOfCalls || 0) + 1;
      }
    }]);
  
    return B;
  }(), (
    _applyDecoratedDescriptor(
      classB.prototype,
      "method",
      [decoB],
      Object.getOwnPropertyDescriptor(classB.prototype, "method"),
      classB.prototype
    )
  ), classB);

  const C = (classC = function () {
    function C() {
      _classCallCheck(this, C);
    }
  
    _createClass(C, [{
      key: "method",
      value: function method() {
        return this.numberOfCalls = (this.numberOfCalls || 0) + 1;
      }
    }]);
  
    return C;
  }(), (
    _applyDecoratedDescriptor(
      classC.prototype,
      "method",
      [decoC],
      Object.getOwnPropertyDescriptor(classC.prototype, "method"),
      classC.prototype
    )
  ), classC);

  // Assertions
  const a = new A();
  expect(a.method()).toBe(1);
  expect(a.method()).toBe(1);
  expect(a.method('string')).toBe(2);
  expect(a.method('string')).toBe(2);

  const b = new B();
  expect(b.method('string1')).toBe(1);
  expect(b.method('string1')).toBe(1);
  expect(b.method('string1', 'string2')).toBe(2);
  expect(b.method('string1', 'string2')).toBe(2);
  expect(spyB).toHaveBeenCalled()

  const c = new C();
  expect(c.method('string1')).toBe(1);
  expect(c.method('string1')).toBe(1);
  expect(c.method('string1', 'string2')).toBe(1);
  expect(c.method('string1', 'string2')).toBe(1);
  expect(spyC).toHaveBeenCalled()

  // Teardown
  spyB.mockRestore()
  spyC.mockRestore()
})

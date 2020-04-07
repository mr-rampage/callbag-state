import observe from 'callbag-observe';

export function applyMiddleware(...middlewares) {
  return middlewares.reduce((f, g) => (...args) => f(g(...args)));
}

export function getValue(cb) {
  let lastValue;
  observe(value => lastValue = value)(cb);
  return () => lastValue;
}

export function identity(x) {
  return x;
}
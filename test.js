const test = require('tape');
const createStore = require('.');

function applyMiddleware(...middlewares) {
  return middlewares.reduce((f, g) => (...args) => f(g(...args)));
}

test('Redux API', assert => {
  assert.plan(5);

  const store = createStore(x => x);
  const methods = Object.keys(store);

  assert.equals(methods.length, 4, 'should contain 4 methods');
  assert.true(methods.includes('subscribe'), 'should contain subscribe');
  assert.true(methods.includes('dispatch'), 'should contain dispatch');
  assert.true(methods.includes('getState'), 'should contain getState');
  assert.true(methods.includes('replaceReducer'), 'should contain replaceReducer');
});

test('Invalid reducer', assert => {
  assert.plan(4);

  assert.throws(() => createStore(undefined))
  assert.throws(() => createStore('test'))
  assert.throws(() => createStore({}))
  assert.doesNotThrow(() => createStore(() => { }))
});

test('Initial state', assert => {
  assert.plan(1);

  const store = createStore(() => { }, [{ id: 1, text: 'Hello' }]);

  assert.deepEqual(store.getState(), [{ id: 1, text: 'Hello' }]);
});

test('Reducers', assert => {
  const appendReducer = (state, action) => action.payload ? [...state, action.payload] : state;

  const store = createStore(appendReducer, []);

  store.dispatch({});
  assert.deepEqual(store.getState(), [], 'should not change on unknown action');

  store.dispatch({ type: 'ADD_PAYLOAD', payload: 'Hello' });
  assert.deepEqual(store.getState(), ['Hello'], 'should process the first action');

  store.dispatch({ type: 'ADD_PAYLOAD', payload: 'World' });
  assert.deepEqual(store.getState(), ['Hello', 'World'], 'should process the second action');

  assert.end();
});

test('Middleware', assert => {
  const appendReducer = (state, action) => action.payload ? [...state, action.payload] : state;
  const middleware = applyMiddleware(
    (action, state) => { console.log(action, state); return action; },
    action => Promise.resolve(action)
  );
  const expectations = [[], ['Hello'], ['Hello', 'World']];

  const store = createStore(appendReducer, [], middleware);

  store.subscribe(state => {
    const expected = expectations.shift();
    assert.deepEqual(state, expected, `should be equal to ${JSON.stringify(expected)}`);
    if (expectations.length === 0) {
      assert.end();
    }
  });

  store.dispatch({});
  store.dispatch({ type: 'ADD_PAYLOAD', payload: 'Hello' });
  store.dispatch({ type: 'ADD_PAYLOAD', payload: 'World' });
});

test('Repace Reducer', assert => {
  const appendReducer = (state, action) => action.payload ? [...state, action.payload] : state;
  const prependReducer = (state, action) => action.payload ? [action.payload, ...state] : state;

  const store = createStore(appendReducer, []);

  store.dispatch({});
  store.dispatch({ type: 'ADD_PAYLOAD', payload: 'Hello' });
  store.dispatch({ type: 'ADD_PAYLOAD', payload: 'World' });

  store.replaceReducer(prependReducer);
  assert.deepEqual(store.getState(), ['Hello', 'World'], 'should not affect state on replace reducer');

  store.dispatch({ type: 'ADD_PAYLOAD', payload: 'World' });
  assert.deepEqual(store.getState(), ['World', 'Hello', 'World'], 'should use the new reducer');

  store.replaceReducer(appendReducer);
  store.dispatch({ type: 'ADD_PAYLOAD', payload: 'Hello' });
  assert.deepEqual(store.getState(), ['World', 'Hello', 'World', 'Hello'], 'should use the new reducer');

  assert.end();
});
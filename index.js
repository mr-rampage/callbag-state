import makeBehaviorSubject from 'callbag-behavior-subject';
import combine from 'callbag-combine';
import latest from 'callbag-latest';
import map from 'callbag-map';
import observe from 'callbag-observe';
import pipe from 'callbag-pipe';
import makeProxy from 'callbag-proxy';
import remember from 'callbag-remember';
import sampleCombine from 'callbag-sample-combine';
import startWith from 'callbag-start-with';
import makeSubject from 'callbag-subject';

export default function createStore(reducer, initialState = {}) {
  validateArguments(reducer);

  const action$ = makeSubject();
  const reducer$ = makeBehaviorSubject(reducer);
  const state$ = makeState$(action$, reducer$)(initialState);

  return {
    subscribe: listener => observe(listener)(state$),
    dispatch: action => action$(1, action),
    getState: currentState(state$),
    replaceReducer: reducer => reducer$(1, reducer)
  }
}

function validateArguments(reducer) {
  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.')
  }
}

function makeState$(action$, reducer$) {
  return initialState => {
    const stateProxy = makeProxy();
    const state$ = pipe(
      action$,
      sampleCombine(latest(combine(reducer$, stateProxy))),
      map(([action, [reducer, state]]) => reducer(state, action)),
      startWith(initialState),
      remember
    )
    stateProxy.connect(state$);
    return state$;
  }
}

function currentState(state$) {
  let currentState;
  observe(state => currentState = state)(state$);
  return () => currentState;
}
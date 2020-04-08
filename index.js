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
import { getValue, identity } from './lib/utils';
import operate from 'callbag-operate';
import distinctUntilChanged from 'callbag-distinct-until-changed';

export default function createStore(reducer, initialState = {}, middleware = () => identity) {
  validateArguments(reducer, middleware);

  const action$ = makeSubject();
  const reducer$ = makeBehaviorSubject(reducer);
  const middleware$ = makeSubject();
  const state$ = makeState$(action$, middleware$, reducer$)(initialState);

  const store = makeStore(state$, action$, reducer$);
  middleware$(1, middleware(store));
  
  return store;
}

function validateArguments(reducer, middleware) {
  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.')
  }

  if (typeof middleware !== 'function') {
    throw new Error('Expected the enhancer to be a function.')
  }
}

function makeState$(action$, middleware$, reducer$) {
  return initialState => {
    const stateProxy = makeProxy();
    const state$ = pipe(
      action$,
      enhancer(middleware$),
      reducer(reducer$, stateProxy),
      startWith(initialState),
      distinctUntilChanged(),
      remember
    );
    stateProxy.connect(state$);
    return state$;
  }
}

function enhancer(middleware$) {
  return operate(
    sampleCombine(latest(middleware$)),
    map(([action, enhancer]) => enhancer(action))
  );
}

function reducer(reducer$, state$) {
  return operate(
    sampleCombine(latest(combine(reducer$, state$))),
    map(([action, [reducer, state]]) => reducer(state, action)),
  );
}

function makeStore(state$, action$, reducer$) {
  return Object.freeze({
    subscribe: listener => observe(listener)(state$),
    dispatch: action => action$(1, action),
    getState: getValue(state$),
    replaceReducer: reducer => reducer$(1, reducer)
  });
}
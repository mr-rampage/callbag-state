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
import {getValue, identity} from './lib/utils';
import operate from 'callbag-operate';
import distinctUntilChanged from 'callbag-distinct-until-changed';

export default function createStore(reducer, initialState = {}, middleware = () => identity) {
  validateArguments(reducer, middleware);

  const action$ = makeSubject();
  const reducer$ = makeBehaviorSubject(reducer);
  const { state$, dispatch } = makeState$(action$, reducer$, middleware)(initialState);

  return {
    subscribe: listener => observe(listener)(state$),
    dispatch,
    getState: makeGetState(state$),
    replaceReducer: reducer => reducer$(1, reducer)
  }
}

function validateArguments(reducer, middleware) {
  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.')
  }

  if (typeof middleware !== 'function') {
    throw new Error('Expected the enhancer to be a function.')
  }
}

function makeState$(action$, reducer$, middleware) {
  return initialState => {
    const dispatch = makeDispatch(action$);
    const stateProxy = makeProxy();
    const state$ = pipe(
      action$,
      enhancer(middleware, stateProxy, dispatch),
      reducer(reducer$, stateProxy),
      startWith(initialState),
      distinctUntilChanged(),
      remember
    );
    stateProxy.connect(state$);
    return { state$, dispatch };
  }
}

function enhancer(middleware, state$, dispatch) {
  return map((action) => middleware({ dispatch, getState: makeGetState(state$)})(action));
}

function reducer(reducer$, state$) {
  return operate(
    sampleCombine(latest(combine(reducer$, state$))),
    map(([action, [reducer, state]]) => reducer(state, action)),
  );
}

function makeDispatch(action$) {
  return action => {
    action$(1, action);
  }
}

function makeGetState(state$) {
  return getValue(state$);
}
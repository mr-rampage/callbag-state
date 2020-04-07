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
import fromAny from './lib/from';
import flatMap from 'callbag-flat-map';
import operate from 'callbag-operate';
import distinctUntilChanged from 'callbag-distinct-until-changed';

export default function createStore(reducer, initialState = {}, middleware = identity) {
  validateArguments(reducer);

  const action$ = makeSubject();
  const reducer$ = makeBehaviorSubject(reducer);
  const state$ = makeState$(action$, reducer$, middleware)(initialState);

  return {
    subscribe: listener => observe(listener)(state$),
    dispatch: action => action$(1, action),
    getState: getValue(state$),
    replaceReducer: reducer => reducer$(1, reducer)
  }
}

function validateArguments(reducer) {
  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.')
  }
}

function makeState$(action$, reducer$, middleware) {
  return initialState => {
    const stateProxy = makeProxy();
    const state$ = pipe(
      action$,
      enhance(middleware),
      reduce(reducer$, stateProxy),
      startWith(initialState),
      distinctUntilChanged(),
      remember
    );
    stateProxy.connect(state$);
    return state$;
  }
}

function enhance(enhancer) {
  return operate(
    flatMap(action => fromAny(enhancer(action)), (_, action) => action),
  )
}

function reduce(reducer$, state$) {
  return operate(
    sampleCombine(latest(combine(reducer$, state$))),
    map(([action, [reducer, state]]) => reducer(state, action)),
  );
}
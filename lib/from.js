import fromPromise from 'callbag-from-promise';
import fromObs from 'callbag-from-obs';
import fromIter from 'callbag-from-iter';

export default function fromAny(source) {
  if (source.then) return fromPromise(source);
  else if (source.subscribe) return fromObs(source);
  else if (source != null && Symbol !== 'undefined' && typeof source[Symbol.iterator] === 'function') return fromIter(source);
  else return fromIter([source]);
}
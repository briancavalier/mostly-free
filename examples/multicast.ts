import { newDefaultScheduler } from '@most/scheduler'

import { Eff, spawnEff } from './../src/eff'
import { multicast } from './../src/multicast'
import { analyze, compile } from '../src/analyze'
import {
  Empty,
  Merge,
  OneToOne,
  Sink,
  Stream,
  TwoToOne,
  at,
  empty,
  map,
  merge,
  runStream,
} from '../src/stream'

const s0 = at<number>(10, 123)
const s1 = map(x => x + 1, s0)
const s2 = map(x => x + 2, s0)
const s = merge(s1, s2)

const defaultMerge = <R>(rs: R[]): R => rs[0]

type MMap = Map<Stream<any, any>, Set<Stream<any, any>>>
type MState = {
  edges: MMap
  state: Map<Stream<any, any>, Stream<any, any>>
}

const m: MMap = new Map()

const findEdges = <E, A, R>(m: MMap, s: Stream<E, A>): MMap => {
  if (s instanceof OneToOne) {
    const d = m.get(s.stream) || new Set()
    d.add(s)
    m.set(s.stream, d)
  } else if (s instanceof TwoToOne) {
    const d1 = m.get(s.stream1) || new Set()
    d1.add(s)
    m.set(s.stream1, d1)

    const d2 = m.get(s.stream2) || new Set()
    d2.add(s)
    m.set(s.stream2, d2)
  }

  return m
}

const applyMulticast = <E, R>({ edges, state }: MState): (<A>(s: Stream<E, A>) => Stream<E, A>) => <
  A
>(
  s: Stream<E, A>,
): Stream<E, A> => {
  const ms = state.get(s)
  if (ms) {
    return ms
  }

  const ss = edges.get(s)
  if (ss && ss.size > 1) {
    const m = multicast(s)
    state.set(s, m)
    return m
  }

  return s
}

const propagateEmpty = <E, A>(s: Stream<E, A>): Stream<E, A> =>
  s instanceof OneToOne && s.stream instanceof Empty ? (empty() as Stream<E, A>) : s

const mergeEmpty = <E, A>(s: Stream<E, A>): Stream<E, A> =>
  s instanceof TwoToOne && s.handler instanceof Merge
    ? s.stream1 instanceof Empty ? s.stream2 : s.stream2 instanceof Empty ? s.stream1 : s
    : s

const edges = analyze(findEdges, m, s)

const ss = compile(
  applyMulticast({ edges, state: new Map() }),
  compile(mergeEmpty, compile(propagateEmpty, s)),
)

console.log(s)

console.log(ss)

const eff2 = runStream((t, a) => console.log(t, a), ss)

const env = { scheduler: newDefaultScheduler() }

spawnEff(env, eff2).promise.then(console.log)

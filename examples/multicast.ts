import { Eff } from './../src/eff';
import { analyze, compile } from '../src/analyze'
import { Stream, Sink, empty, map, merge, OneToOne, TwoToOne } from '../src/stream'

const s0 = empty<number>()
const s1 = map(x => x + 1, s0)
const s = merge(s0, s1)

type MMap = Map<Stream<any, any, any>, Set<Stream<any, any, any>>>
type MState = {
  edges: MMap,
  state: Map<Stream<any, any, any>, Multicast<any, any, any>>
}

const m: MMap = new Map()

class Multicast<E, A, R> implements Stream<E, A, R> {
  constructor (public stream: Stream<E, A, R>) {}
  run (s: Sink<A>): Eff<E, R> {
    return this.stream.run(s)
  }
}

const findEdges = <E, A, R> (m: MMap, s: Stream<E, A, R>): MMap => {
  if(s instanceof OneToOne) {
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

const applyMulticast = <E, A, R> ({ edges, state }: MState): ((s: Stream<E, A, R>) => Stream<E, A, R>) =>
  (s: Stream<E, A, R>): Stream<E, A, R> => {
    let ms = state.get(s)
    if (ms) {
      return ms
    }

    const ss = edges.get(s)
    if (ss && ss.size > 1) {
      const multicast = new Multicast(s)
      state.set(s, multicast)
      return multicast
    }

    return s
  }

const edges = analyze(findEdges, m, s)

const ss = compile(applyMulticast({ edges, state: new Map() }), s) as Stream<{}, number, number>

console.log(s)

console.log(ss)

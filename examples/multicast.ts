import { analyze } from '../src/analyze'
import { Stream, empty, map, merge, OneToOne, TwoToOne } from '../src/stream'

const s0 = empty<number>()
const s1 = map(x => x + 1, s0)
const s = merge(s0, s1)

type MMap = Map<Stream<any, any, any>, Set<Stream<any, any, any>>>

const m: MMap = new Map()

const accum = <E, A, R> (m: MMap, e: Stream<E, A, R>): MMap => {
  if(e instanceof OneToOne) {
    const d = m.get(e.stream) || new Set()
    d.add(e)
    m.set(e.stream, d)
  } else if (e instanceof TwoToOne) {
    const d1 = m.get(e.stream1) || new Set()
    d1.add(e)
    m.set(e.stream1, d1)

    const d2 = m.get(e.stream2) || new Set()
    d2.add(e)
    m.set(e.stream2, d2)
  }

  return m
}

const edges = analyze(accum, m, s)
for (const [k, ss] of edges) {
  if (ss.size > 1) {
    console.log('multicast', k)
  }
}

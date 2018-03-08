import { analyze } from '../src/analyze'
import { OneToOne, Stream, TwoToOne, empty, map } from '../src/stream'

const s0 = empty<{}, number>()
const s1 = map(x => x + 1, s0)
const s = map(x => x + 1, s1)

const toString = <E, A, R>(a: string[], e: Stream<E, A, R>): string[] =>
  a.concat(
    e instanceof OneToOne
      ? e.handler.constructor.name
      : e instanceof TwoToOne ? e.handler.constructor.name : e.constructor.name,
  )

console.log(analyze(toString, [], s).join(' -> '))

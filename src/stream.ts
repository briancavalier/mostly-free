import { delay } from '@most/scheduler'
import { Scheduler, Time } from '@most/types'

import { Cont, Eff, liftA2Eff, pureEff } from './eff'

// A Sink consumes zero or more As
export type Sink<A> = (t: Time, a: A) => void

export interface Stream<E, A> {
  run(s: Sink<A>): Eff<E, Time>
}

export type Producer<E, A> = Stream<E, A>

// A OneToOne produces Bs using As from a single upstream source
export class OneToOne<E, A, B> implements Stream<E, B> {
  constructor(public stream: Stream<E, A>, public handler: RunOneToOne<E, A, B>) {}

  run(s: Sink<B>): Eff<E, Time> {
    return this.handler.run(this.stream, s)
  }
}

export interface RunOneToOne<E, A, B> {
  run(stream: Stream<E, A>, s: Sink<B>): Eff<E, Time>
}

// A TwoToOne produces Cs by combining As and Bs from 2 respective upstream sources
export class TwoToOne<E1, E2, A, B, C> implements Stream<E1 & E2, C> {
  constructor(
    public stream1: Stream<E1, A>,
    public stream2: Stream<E2, B>,
    public handler: RunTwoToOne<E1, E2, A, B, C>,
  ) {}

  run(s: Sink<C>): Eff<E1 & E2, Time> {
    return this.handler.run(this.stream1, this.stream2, s)
  }
}

export interface RunTwoToOne<E1, E2, A, B, C> {
  run<R>(stream1: Stream<E1, A>, stream2: Stream<E2, B>, s: Sink<C>): Eff<E1 & E2, Time>
}

// Consume all the As using environment E to produce an effectful result R
export const runStream = <E, A, R>(s: Sink<A>, sa: Stream<E, A>): Eff<E, Time> => sa.run(s)

// Events containing a single event at time t with value a
// and whose result is also t
export const at = <A>(t: Time, a: A): Stream<{ scheduler: Scheduler }, A> => new At(t, a)

export class At<E extends { scheduler: Scheduler }, A> implements Producer<E, A> {
  constructor(public readonly time: Time, public readonly value: A) {}
  run(s: Sink<A>): Eff<E, Time> {
    return new Eff(({ scheduler }, k) => {
      const t = delay(this.time, new AtTask(k, this.value, s), scheduler)
      return {
        kill() {
          return Promise.resolve(t.dispose())
        },
      }
    })
  }
}

class AtTask<A> {
  constructor(
    public readonly k: Cont<Time>,
    public readonly value: A,
    public readonly sink: Sink<A>,
  ) {}

  run(t: Time): void {
    this.sink(t, this.value)
    this.k(t)
  }

  error(t: Time, e: Error) {
    throw e
  }

  dispose() {}
}

export const empty = <E, A>(): Stream<E, A> => new Empty()

export class Empty<E, A> implements Producer<E, A> {
  run(s: Sink<A>): Eff<E, Time> {
    return pureEff(0)
  }
}

// Turn an Event of As into an Event of Bs
export const map = <E, A, B>(f: (a: A) => B, sa: Stream<E, A>): Stream<E, B> =>
  new OneToOne(sa, new Map(f))

export class Map<E, A, B> implements RunOneToOne<E, A, B> {
  constructor(public f: (a: A) => B) {}

  run(sa: Stream<E, A>, s: Sink<B>): Eff<E, Time> {
    return sa.run((t, a) => s(t, this.f(a)))
  }
}

// Keep only As matching a predicate
export declare function filter<E, A>(f: (a: A) => boolean, sa: Stream<E, A>): Stream<E, A>

// Keep As from both Events
export const merge = <E1, E2, A>(s1: Stream<E1, A>, s2: Stream<E2, A>): Stream<E1 & E2, A> =>
  new TwoToOne(s1, s2, new Merge())

export class Merge<E1, E2, A> implements RunTwoToOne<E1, E2, A, A, A> {
  run(s1: Stream<E1, A>, s2: Stream<E2, A>, s: Sink<A>): Eff<E1 & E2, Time> {
    return liftA2Eff(Math.max, s1.run(s), s2.run(s))
  }
}

// Switch to each inner Event as it arrives
export declare function switchLatest<E1, E2, A>(ssa: Stream<E1, Stream<E2, A>>): Stream<E1 & E2, A>

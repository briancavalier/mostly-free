import { Eff, pureEff, liftA2Eff } from './eff'

export type Time = number

// A Sink consumes zero or more As
export type Sink<A> = (t: Time, a: A) => void

// An Event uses environment E to produce zero or more
// discrete As and to compute a result R. Errors may be represented
// by picking an appropriate R, such as Either
// Events is a coproduct (sum), represented here in TS by
// a superclass as the type, and subclasses as its variant
// data constructors.
// data Events = Producer | OneToOne | ManyToOne
export interface Stream<E, A, R> {
  run (s: Sink<A>): Eff<E, R>
}

export type Producer<E, A, R> = Stream<E, A, R>

// A OneToOne produces Bs using As from a single upstream source
export class OneToOne<E, A, B, R> implements Stream<E, B, R> {
  constructor (public stream: Stream<E, A, R>, public handler: RunOneToOne<E, A, B, R>) {}

  run (s: Sink<B>): Eff<E, R> {
    return this.handler.run(this.stream, s)
  }
}

export interface RunOneToOne<E, A, B, R> {
  run (stream: Stream<E, A, R>, s: Sink<B>): Eff<E, R>
}

// A TwoToOne produces Cs by combining As and Bs from 2 respective upstream sources
export class TwoToOne<E1, E2, A, B, C, R> implements Stream<E1 & E2, C, R> {
  constructor (public stream1: Stream<E1, A, R>, public stream2: Stream<E2, B, R>, public handler: RunTwoToOne<E1, E2, A, B, C, R>) {}

  run (s: Sink<C>): Eff<E1 & E2, R> {
    return this.handler.run(this.stream1, this.stream2, s)
  }
}

export interface RunTwoToOne<E1, E2, A, B, C, R> {
  run (stream1: Stream<E1, A, R>, stream2: Stream<E2, B, R>, s: Sink<C>): Eff<E1 & E2, R>
}

// Consume all the As using environment E to produce an effectful result R
export const runEvent = <E, A, R> (s: Sink<A>, sa: Stream<E, A, R>): Eff<E, R> =>
  sa.run(s)

  // Events containing a single event at time t with value a
// and whose result is also t
export declare function at <A> (t: Time, a: A): Stream<{}, A, Time>

export const empty = <A> (): Stream<{}, A, Time> =>
  new Empty()

class Empty<E extends {}, A> implements Producer<E, A, Time> {
  run (s: Sink<A>): Eff<E, Time> {
    return pureEff(0)
  }
}

// Turn an Event of As into an Event of Bs
export const map = <E, A, B, R> (f: (a: A) => B, sa: Stream<E, A, R>): Stream<E, B, R> =>
  new OneToOne(sa, new Map(f))

export class Map<E, A, B, R> implements RunOneToOne<E, A, B, R> {
  constructor (public f: (a: A) => B) {}

  run (sa: Stream<E, A, R>, s: Sink<B>): Eff<E, R> {
    return sa.run((t, a) => s(t, this.f(a)))
  }
}

// Keep only As matching a predicate
export declare function filter<E, A, R> (f: (a: A) => boolean, sa: Stream<E, A, R>): Stream<E, A, R>

// Keep As from both Events
export const merge = <E1, E2, A, R> (s1: Stream<E1, A, R>, s2: Stream<E2, A, R>): Stream<E1 & E2, A, R> =>
  new TwoToOne(s1, s2, new Merge())

class Merge<E1, E2, A, R> implements RunTwoToOne<E1, E2, A, A, A, R> {
  run (s1: Stream<E1, A, R>, s2: Stream<E2, A, R>, s: Sink<A>): Eff<E1 & E2, R> {
    return liftA2Eff((r1: R, r2: R) => r1, s1.run(s), s2.run(s))
  }
}

// Switch to each inner Event as it arrives
export declare function switchLatest<E1, E2, A, R> (ssa: Stream<E1, Stream<E2, A, R>, R>): Stream<E1 & E2, A, R>

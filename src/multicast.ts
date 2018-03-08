import { Time } from '@most/types'

import { Cont, Eff, Fiber } from './eff'
import { Producer, Sink, Stream } from './stream'

const EMPTY_FIBER = {
  kill() {
    return Promise.resolve()
  },
}
const EMPTY_SINK: Sink<any> = (t: Time, a: any) => {}

export const multicast = <E, A>(s: Stream<E, A>): Stream<E, A> => new OneToMany(s)

export class OneToMany<E, A> implements Producer<E, A> {
  sinks: { sink: Sink<A>; k: Cont<Time> }[] = []
  fiber: Fiber = EMPTY_FIBER

  constructor(public readonly source: Stream<E, A>) {}

  run(sink: Sink<A>): Eff<E, Time> {
    return new Eff((e, k) => {
      this.sinks.push({ sink, k })
      if (this.sinks.length === 1) {
        this.fiber = this.source.run((t, a) => this._event(t, a)).runEff(e, t => {
          this.sinks.forEach(s => s.k(t))
        })
      }

      return new MulticastFiber(this, sink)
    })
  }

  _kill() {
    const fiber = this.fiber
    this.fiber = EMPTY_FIBER
    return fiber.kill()
  }

  _remove(sink: Sink<A>): boolean {
    this.sinks = this.sinks.filter(s => s.sink !== sink)
    return this.sinks.length === 0
  }

  _event(t: Time, a: A): void {
    this.sinks.forEach(s => s.sink(t, a))
  }
}

export class MulticastFiber<E, A, R> {
  constructor(public readonly source: OneToMany<E, A>, public readonly sink: Sink<A>) {}

  kill(): Promise<any> {
    return this.source._remove(this.sink) ? this.source._kill() : Promise.resolve()
  }
}

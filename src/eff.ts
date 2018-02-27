import { analyze } from './analyze';

export interface Computation {
  halt (): void
}

// Simple continuation
export type Cont <A> = (a: A) => void

export type RunEff <E, A> = (env: E, k: Cont<A>) => Computation

// Effect that receives an environment E, performs a
// computation to produce an A, and then calls the provided
// continuation with the A
export class Eff<E, A> {
  constructor(public runEff: RunEff<E, A>) {}
}

export const pureEff = <A> (a: A): Eff<{}, A> =>
  new Eff((_, k) => {
    k(a)
    return { halt() {} }
  })

export const mapEff = <E, A, B> (f: (a: A) => B, { runEff }: Eff<E, A>): Eff<E, B> =>
  new Eff((e, k) => {
    return runEff(e, a => {
      return k(f(a))
    })
  })

export function liftA2Eff <E1, E2, E extends E1 & E2, A, B, C> (f: (a: A, b: B) => C, ea: Eff<E1, A>, eb: Eff<E2, B>): Eff<E, C> {
  return new Eff((e: E, kc: Cont<C>): Computation => {
    let ra: A
    let rb: B
    let remaining = 2
    const check = () => {
      if(--remaining === 0) {
        kc(f(ra, rb))
      }
    }
    const c1 = ea.runEff(e, a => {
      ra = a
      check()
    })

    const c2 = eb.runEff(e, b => {
      rb = b
      check()
    })

    return {
      halt() {
        c1.halt()
        c2.halt()
      }
    }
  })
}

export const apEff = <E1, E2, E extends E1 & E2, A, B> (eab: Eff<E1, (a: A) => B>, ea: Eff<E2, A>): Eff<E, B> =>
  liftA2Eff((f, a) => f(a), eab, ea)

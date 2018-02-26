export interface Computation {
  halt (): void
}

// Simple continuation
export type Cont <A> = (a: A) => void

export type RunEff <E, A> = (env: E, k: Cont<A>) => Computation

// Effect monad that receives an environment E, performs a
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

export const apEff = <E1, E2, E extends E1 & E2, A, B> (effab: Eff<E1, (a: A) => B>, { runEff }: Eff<E2, A>): Eff<E, B> =>
  new Eff((e, k) => {
    return effab.runEff(e, f => {
      return runEff(e, a => k(f(a)))
    })
  })

export const chainEff = <E1, E2, E extends E1 & E2, A, B> (f: (a: A) => Eff<E2, B>, { runEff }: Eff<E1, A>): Eff<E, B> =>
  new Eff((e, k) => {
    return runEff(e, a => {
      return f(a).runEff(e, k)
    })
  })

export interface Fiber {
  kill(): Promise<any>
}

export class Computation<A> {
  constructor(public fiber: Fiber, public promise: Promise<A>) {}
}

// Simple continuation
export type Cont<A> = (a: A) => void

export type RunEff<E, A> = (env: E, k: Cont<A>) => Fiber

// Effect that receives an environment E, performs a
// computation to produce an A, and then calls the provided
// continuation with the A
export class Eff<E, A> {
  constructor(public runEff: RunEff<E, A>) {}
}

export const spawnEff = <E, A>(e: E, eff: Eff<E, A>): Computation<A> => {
  let res: (a: A) => void
  const p = new Promise<A>(resolve => (res = resolve))
  return new Computation(eff.runEff(e, a => res(a)), p)
}

export const pureEff = <A>(a: A): Eff<{}, A> =>
  new Eff((_, k) => {
    k(a)
    return {
      kill() {
        return Promise.resolve()
      },
    }
  })

export const mapEff = <E, A, B>(f: (a: A) => B, { runEff }: Eff<E, A>): Eff<E, B> =>
  new Eff((e, k) => runEff(e, a => k(f(a))))

export function liftA2Eff<E1, E2, E extends E1 & E2, A, B, C>(
  f: (a: A, b: B) => C,
  ea: Eff<E1, A>,
  eb: Eff<E2, B>,
): Eff<E, C> {
  return new Eff((e: E, kc: Cont<C>): Fiber => {
    let ra: A
    let rb: B
    let remaining = 2
    const check = (ra: A, rb: B) => {
      if (--remaining === 0) {
        kc(f(ra, rb))
      }
    }
    const c1 = ea.runEff(e, a => check((ra = a), rb))
    const c2 = eb.runEff(e, b => check(ra, (rb = b)))

    return {
      kill() {
        return Promise.all([c1.kill(), c2.kill()])
      },
    }
  })
}

export const apEff = <E1, E2, E extends E1 & E2, A, B>(
  eab: Eff<E1, (a: A) => B>,
  ea: Eff<E2, A>,
): Eff<E, B> => liftA2Eff((f, a) => f(a), eab, ea)

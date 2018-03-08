import { OneToOne, Producer, Stream, TwoToOne } from './stream'

// "Analyze" a stream graph statically
// Basically a right fold over the graph
export const analyze = <W, E, A>(f: <E, T>(w: W, e: Stream<E, T>) => W, w: W, e: Stream<E, A>): W =>
  e instanceof OneToOne
    ? analyzeOneToOne(f, w, e)
    : e instanceof TwoToOne ? analyzeTwoToOne(f, w, e) : f(w, e)

export const analyzeOneToOne = <W, E, A, B>(
  f: <E, T>(w: W, e: Stream<E, T>) => W,
  w: W,
  eb: OneToOne<E, A, B>,
): W => f(analyze(f, w, eb.stream), eb)

export const analyzeTwoToOne = <W, E1, E2, A, B, C>(
  f: <E, T>(w: W, e: Stream<E, T>) => W,
  w: W,
  ec: TwoToOne<E1, E2, A, B, C>,
): W => f(analyze(f, analyze(f, w, ec.stream1), ec.stream2), ec)

// TODO: Figure out whether this is really just analyze
export const compile = <E, A>(
  f: <E, T>(e: Stream<E, T>) => Stream<E, T>,
  e: Stream<E, A>,
): Stream<E, A> =>
  e instanceof OneToOne
    ? compileOneToOne(f, e)
    : e instanceof TwoToOne ? compileTwoToOne(f, e) : f(e)

export const compileOneToOne = <E, A, B>(
  f: <E, T>(s: Stream<E, T>) => Stream<E, T>,
  { stream, handler }: OneToOne<E, A, B>,
): Stream<E, B> => f(new OneToOne(compile(f, stream), handler))

export const compileTwoToOne = <E1, E2, A, B, C>(
  f: <E, T>(s: Stream<E, T>) => Stream<E, T>,
  { stream1, stream2, handler }: TwoToOne<E1, E2, A, B, C>,
): Stream<E1 & E2, C> => f(new TwoToOne(compile(f, stream1), compile(f, stream2), handler))

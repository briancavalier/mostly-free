import { Stream, Producer, OneToOne, TwoToOne } from './stream';

// "Analyze" a stream graph statically
// Basically a right fold over the graph
export const analyze = <W, E, A, R> (f: <T> (w: W, e: Stream<E, T, R>) => W, w: W, e: Stream<E, A, R>): W =>
  e instanceof OneToOne ? analyzeOneToOne(f, w, e)
  : e instanceof TwoToOne ? analyzeTwoToOne(f, w, e)
  : f(w, e)

export const analyzeOneToOne = <W, E, A, B, R> (f: <T> (w: W, e: Stream<E, T, R>) => W, w: W, eb: OneToOne<E, A, B, R>): W =>
  f(analyze(f, w, eb.stream), eb)

export const analyzeTwoToOne = <W, E1, E2, A, B, C, R> (f: <T> (w: W, e: Stream<E1 & E2, T, R>) => W, w: W, ec: TwoToOne<E1, E2, A, B, C, R>): W =>
  f(analyze(f, analyze(f, w, ec.stream1), ec.stream2), ec)

// TODO: Figure out whether this is really just analyze
export const compile = <E, A, R> (f: <T> (e: Stream<E, T, R>) => Stream<E, T, R>, e: Stream<E, A, R>): Stream<E, A, R> =>
  e instanceof OneToOne ? compileOneToOne(f, e)
  : e instanceof TwoToOne ? compileTwoToOne(f, e)
  : f(e)

export const compileOneToOne = <E, A, B, R> (f: <T> (s: Stream<E, T, R>) => Stream<E, T, R>, { stream, handler }: OneToOne<E, A, B, R>): Stream<E, B, R> =>
  f(new OneToOne(compile(f, stream), handler))

export const compileTwoToOne = <E1, E2, A, B, C, R> (f: <T> (s: Stream<E1 & E2, T, R>) => Stream<E1 & E2, T, R>, { stream1, stream2, handler }: TwoToOne<E1, E2, A, B, C, R>): Stream<E1 & E2, C, R> =>
  f(new TwoToOne(compile(f, stream1), compile(f, stream2), handler))

import { SessionBlockList } from './session-block-list.service.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

// covers: AC-14 (the sid is blocked for 15 minutes, as long as its access tokens live)
describe('SessionBlockList', () => {
  let blockList: SessionBlockList;

  beforeEach(() => {
    vi.useFakeTimers();
    blockList = new SessionBlockList();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('blocks a session it was given and no other', () => {
    blockList.block('family-a');

    expect(blockList.has('family-a')).toBe(true);
    expect(blockList.has('family-b')).toBe(false);
  });

  it('keeps the session blocked until its access tokens have expired', () => {
    blockList.block('family-a');

    vi.advanceTimersByTime(FIFTEEN_MINUTES - 1);

    expect(blockList.has('family-a')).toBe(true);
  });

  it('forgets the session once 15 minutes have passed', () => {
    blockList.block('family-a');

    vi.advanceTimersByTime(FIFTEEN_MINUTES);

    expect(blockList.has('family-a')).toBe(false);
  });

  it('counts the 15 minutes from the latest block of the same session', () => {
    blockList.block('family-a');
    vi.advanceTimersByTime(10 * 60 * 1000);
    blockList.block('family-a');

    vi.advanceTimersByTime(10 * 60 * 1000);

    expect(blockList.has('family-a')).toBe(true);
  });

  it('lets each session expire on its own clock', () => {
    blockList.block('family-a');
    vi.advanceTimersByTime(10 * 60 * 1000);
    blockList.block('family-b');

    vi.advanceTimersByTime(6 * 60 * 1000);

    expect(blockList.has('family-a')).toBe(false);
    expect(blockList.has('family-b')).toBe(true);
  });
});

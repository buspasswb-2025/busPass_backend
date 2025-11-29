
/**
-- ARGV[1] = userId
-- ARGV[2] = idempotencyKey
-- ARGV[3] = ttl (in seconds)
-- KEYS = seat keys
 */

// const lockLua = `
// local locked = {}
// local failed = {}
// local alreadyLocked = {}
// local lockValue = ARGV[1] .. ":" .. ARGV[2]
// local ttl = tonumber(ARGV[3])

// -- Step 1: Check if all requested seats are free
// for i, key in ipairs(KEYS) do
//     local existing = redis.call("GET", key)
//     if existing then
//         -- collect which seats are already locked
//         table.insert(alreadyLocked, key)
//     end
// end

// if #alreadyLocked > 0 then
//     -- If any seat is already locked, fail all
//     for _, k in ipairs(KEYS) do
//         table.insert(failed, k)
//     end
//     -- Return failure and which ones caused it
//     return { "|", "FAILED", unpack(alreadyLocked) }
// end

// -- Step 2: Lock all seats atomically
// for i, key in ipairs(KEYS) do
//     local result = redis.call("SET", key, lockValue, "NX", "EX", ttl)
//     if not result then
//         -- rollback previously locked seats
//         for _, k in ipairs(locked) do
//             redis.call("DEL", k)
//         end
//         for _, k in ipairs(KEYS) do
//             table.insert(failed, k)
//         end
//         return { "|", "FAILED", unpack(KEYS) }
//     end
//     table.insert(locked, key)
// end

// -- Step 3: Success — all locked
// return { "SUCCESS", unpack(locked), "|" }
// `;

const lockLua = `
    local locked = {}
    local failed = {}
    local lockValue = ARGV[1] .. ":" .. ARGV[2]
    local ttl = tonumber(ARGV[3])

    -- Step 1: Check if any requested seat is already locked
    for i, key in ipairs(KEYS) do
        if redis.call("EXISTS", key) == 1 then
            table.insert(failed, key)
        end
    end

    -- Step 2: If any seat already locked, fail the whole operation
    if #failed > 0 then
        return { "FAILED", unpack(failed) }
    end

    -- Step 3: Lock all seats atomically
    for i, key in ipairs(KEYS) do
        local ok = redis.call("SET", key, lockValue, "NX", "EX", ttl)
        if not ok then
            -- Rollback any seats locked so far
            for _, k in ipairs(locked) do
                redis.call("DEL", k)
            end
            return { "FAILED", unpack(KEYS) }
        end
        table.insert(locked, key)
    end

    -- Step 4: All locked successfully
    return { "SUCCESS", unpack(locked) }
`

/**
 * Atomic seat release
 * KEYS = seat keys
 * ARGV[1] = userId ("" = force release)
 */
// const releaseLua = `
// local released = {}
// local failed = {}
// local lockValue = ARGV[1] .. ":" .. ARGV[2] 

// -- Function to attempt release once
// local function tryRelease()
//     local retryReleased = {}
//     local retryFailed = {}

//     for i, key in ipairs(KEYS) do
//         local current = redis.call("GET", key)
//         if current == lockValue then
//             redis.call("DEL", key)
//             table.insert(retryReleased, key)
//         else
//             table.insert(retryFailed, key)
//         end
//     end

//     return retryReleased, retryFailed
// end

// -- First attempt
// released, failed = tryRelease()

// -- Retry once if any failed
// if #failed > 0 then
//     local stillFailed = {}
//     released, stillFailed = tryRelease()

//     if #stillFailed > 0 then
//         return { "PARTIAL", unpack(released), "|", unpack(stillFailed) }
//     end
// end

// -- Success — all released
// return { "SUCCESS", unpack(released), "|" }
// `;


const releaseLua = `
    local lockValue = ARGV[1] .. ":" .. ARGV[2]
    local allOwned = true

    -- Step 1: Check ownership for all seats
    for i, key in ipairs(KEYS) do
        local current = redis.call("GET", key)
        if current ~= lockValue then
            allOwned = false
            break
        end
    end

    -- Step 2: If all are owned, release all; else do nothing
    if allOwned then
        for i, key in ipairs(KEYS) do
            redis.call("DEL", key)
        end
        return {"SUCCESS", unpack(KEYS)}
    else
        return {"FAILED", unpack(KEYS)}
    end
`


export { lockLua, releaseLua };

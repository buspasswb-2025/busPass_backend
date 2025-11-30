
/**
-- ARGV[1] = userId
-- ARGV[2] = idempotencyKey
-- ARGV[3] = ttl (in seconds)
-- KEYS = seat keys
 */

/**
 * Atomic seat release
 * KEYS = seat keys
 * ARGV[1] = userId ("" = force release)
 */
// const lockLua = `
//     local locked = {}
//     local failed = {}
//     local lockValue = ARGV[1] .. ":" .. ARGV[2]
//     local ttl = tonumber(ARGV[3])

//     -- Step 1: Check if any requested seat is already locked
//     for i, key in ipairs(KEYS) do
//         if redis.call("EXISTS", key) == 1 then
//             table.insert(failed, key)
//         end
//     end

//     -- Step 2: If any seat already locked, fail the whole operation
//     if #failed > 0 then
//         return { "FAILED", unpack(failed) }
//     end

//     -- Step 3: Lock all seats atomically
//     for i, key in ipairs(KEYS) do
//         local ok = redis.call("SET", key, lockValue, "NX", "EX", ttl)
//         if not ok then
//             -- Rollback any seats locked so far
//             for _, k in ipairs(locked) do
//                 redis.call("DEL", k)
//             end
//             return { "FAILED", unpack(KEYS) }
//         end
//         table.insert(locked, key)
//     end

//     -- Step 4: All locked successfully
//     return { "SUCCESS", unpack(locked) }
// `

// const releaseLua = `
//     local lockValue = ARGV[1] .. ":" .. ARGV[2]
//     local allOwned = true

//     -- Step 1: Check ownership for all seats
//     for i, key in ipairs(KEYS) do
//         local current = redis.call("GET", key)
//         if current ~= lockValue then
//             allOwned = false
//             break
//         end
//     end

//     -- Step 2: If all are owned, release all; else do nothing
//     if allOwned then
//         for i, key in ipairs(KEYS) do
//             redis.call("DEL", key)
//         end
//         return {"SUCCESS", unpack(KEYS)}
//     else
//         return {"FAILED", unpack(KEYS)}
//     end
// `


// utills/luaScript.js


const lockLua = `
    local bookingKey = KEYS[1]  -- Single key: trip:123:booking:user456:idempotency123
    local seatListKey = KEYS[2] -- Key to store seat list: trip:123:seats
    local lockValue = ARGV[1]   -- userId:idempotencyKey
    local ttl = tonumber(ARGV[2])
    local seats = {}            -- ARGV[3], ARGV[4], ... are seat numbers
    
    -- Collect all seat numbers from arguments
    for i = 3, #ARGV do
        table.insert(seats, ARGV[i])
    end
    
    -- Step 1: Check if any seat is already locked
    local lockedSeats = redis.call("SMEMBERS", seatListKey)
    local failed = {}
    
    for _, requestedSeat in ipairs(seats) do
        for _, lockedSeat in ipairs(lockedSeats) do
            if requestedSeat == lockedSeat then
                table.insert(failed, requestedSeat)
            end
        end
    end
    
    -- Step 2: If any seat is locked, fail
    if #failed > 0 then
        return { "FAILED", unpack(failed) }
    end
    
    -- Step 3: Lock all seats atomically
    -- Store booking metadata
    local bookingData = cjson.encode({
        userId = ARGV[1],
        seats = seats,
        lockedAt = redis.call("TIME")[1]
    })
    
    local ok = redis.call("SET", bookingKey, bookingData, "NX", "EX", ttl)
    if not ok then
        return { "FAILED", unpack(seats) }
    end
    
    -- Add seats to the locked set
    redis.call("SADD", seatListKey, unpack(seats))
    
    -- Set expiry on seat list (same as booking)
    redis.call("EXPIRE", seatListKey, ttl)
    
    return { "SUCCESS", unpack(seats) }
`

const releaseLua = `
    local bookingKey = KEYS[1]
    local seatListKey = KEYS[2]
    local lockValue = ARGV[1]  -- userId:idempotencyKey
    
    -- Step 1: Check if booking exists and matches
    local bookingData = redis.call("GET", bookingKey)
    if not bookingData then
        return {"FAILED", "BOOKING_NOT_FOUND"}
    end
    
    local booking = cjson.decode(bookingData)
    if booking.userId ~= ARGV[1] then
        return {"FAILED", "UNAUTHORIZED"}
    end
    
    -- Step 2: Release all seats
    redis.call("DEL", bookingKey)
    redis.call("SREM", seatListKey, unpack(booking.seats))
    
    return {"SUCCESS", unpack(booking.seats)}
`

export { lockLua, releaseLua };

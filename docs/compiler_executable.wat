(module
  (memory (export "memory") 1)
  (global $pc (mut i32) (i32.const 3))
  (global $wat_len (mut i32) (i32.const 36))
  (func $transition (export "transition")
    i32.const 1024
    global.get $wat_len
    i32.const 4
    i32.mul
    i32.add
    i32.const 103
    i32.const 103
    i32.const 105
    i32.const 0
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 43
    i32.eq
    select
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 121
    i32.eq
    select
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 120
    i32.eq
    select
    i32.store
    i32.const 1024
    global.get $wat_len
    i32.const 1
    i32.add
    i32.const 4
    i32.mul
    i32.add
    i32.const 108
    i32.const 108
    i32.const 51
    i32.const 0
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 43
    i32.eq
    select
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 121
    i32.eq
    select
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 120
    i32.eq
    select
    i32.store
    i32.const 1024
    global.get $wat_len
    i32.const 2
    i32.add
    i32.const 4
    i32.mul
    i32.add
    i32.const 111
    i32.const 111
    i32.const 50
    i32.const 0
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 43
    i32.eq
    select
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 121
    i32.eq
    select
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 120
    i32.eq
    select
    i32.store
    i32.const 1024
    global.get $wat_len
    i32.const 3
    i32.add
    i32.const 4
    i32.mul
    i32.add
    i32.const 98
    i32.const 98
    i32.const 46
    i32.const 0
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 43
    i32.eq
    select
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 121
    i32.eq
    select
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 120
    i32.eq
    select
    i32.store
    i32.const 1024
    global.get $wat_len
    i32.const 4
    i32.add
    i32.const 4
    i32.mul
    i32.add
    i32.const 97
    i32.const 97
    i32.const 97
    i32.const 0
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 43
    i32.eq
    select
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 121
    i32.eq
    select
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 120
    i32.eq
    select
    i32.store
    i32.const 1024
    global.get $wat_len
    i32.const 5
    i32.add
    i32.const 4
    i32.mul
    i32.add
    i32.const 108
    i32.const 108
    i32.const 100
    i32.const 0
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 43
    i32.eq
    select
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 121
    i32.eq
    select
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 120
    i32.eq
    select
    i32.store
    i32.const 1024
    global.get $wat_len
    i32.const 6
    i32.add
    i32.const 4
    i32.mul
    i32.add
    i32.const 46
    i32.const 46
    i32.const 100
    i32.const 0
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 43
    i32.eq
    select
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 121
    i32.eq
    select
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 120
    i32.eq
    select
    i32.store
    i32.const 1024
    global.get $wat_len
    i32.const 7
    i32.add
    i32.const 4
    i32.mul
    i32.add
    i32.const 103
    i32.const 103
    i32.const 10
    i32.const 0
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 43
    i32.eq
    select
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 121
    i32.eq
    select
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 120
    i32.eq
    select
    i32.store
    i32.const 1024
    global.get $wat_len
    i32.const 8
    i32.add
    i32.const 4
    i32.mul
    i32.add
    i32.const 101
    i32.const 101
    i32.const 0
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 121
    i32.eq
    select
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 120
    i32.eq
    select
    i32.store
    i32.const 1024
    global.get $wat_len
    i32.const 9
    i32.add
    i32.const 4
    i32.mul
    i32.add
    i32.const 116
    i32.const 116
    i32.const 0
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 121
    i32.eq
    select
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 120
    i32.eq
    select
    i32.store
    i32.const 1024
    global.get $wat_len
    i32.const 10
    i32.add
    i32.const 4
    i32.mul
    i32.add
    i32.const 32
    i32.const 32
    i32.const 0
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 121
    i32.eq
    select
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 120
    i32.eq
    select
    i32.store
    i32.const 1024
    global.get $wat_len
    i32.const 11
    i32.add
    i32.const 4
    i32.mul
    i32.add
    i32.const 36
    i32.const 36
    i32.const 0
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 121
    i32.eq
    select
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 120
    i32.eq
    select
    i32.store
    i32.const 1024
    global.get $wat_len
    i32.const 12
    i32.add
    i32.const 4
    i32.mul
    i32.add
    i32.const 120
    i32.const 121
    i32.const 0
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 121
    i32.eq
    select
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 120
    i32.eq
    select
    i32.store
    i32.const 1024
    global.get $wat_len
    i32.const 13
    i32.add
    i32.const 4
    i32.mul
    i32.add
    i32.const 10
    i32.const 10
    i32.const 0
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 121
    i32.eq
    select
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 120
    i32.eq
    select
    i32.store
    global.get $wat_len
    i32.const 14
    i32.const 8
    i32.const 0
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 43
    i32.eq
    select
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 120
    i32.eq
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 121
    i32.eq
    i32.or
    select
    i32.add
    global.set $wat_len
    global.get $pc
    i32.const 1
    i32.const 0
    i32.const 0
    global.get $pc
    i32.const 4
    i32.mul
    i32.add
    i32.load
    i32.const 0
    i32.ne
    select
    i32.add
    global.set $pc
  )
  (func $get_pc (export "get_pc") (result i32)
    global.get $pc
  )
  (func $get_wat_len (export "get_wat_len") (result i32)
    global.get $wat_len
  )
)

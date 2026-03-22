/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/sealed_auction_program.json`.
 */
export type SealedAuctionProgram = {
  "address": "9msixs2rRpafs5RaCbLxTeNEiZbvg5Qux3L8qENEN4JZ",
  "metadata": {
    "name": "sealedAuctionProgram",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Sealed-bid auction with MagicBlock ER + Private ER support"
  },
  "instructions": [
    {
      "name": "commitBid",
      "discriminator": [
        149,
        237,
        198,
        113,
        53,
        66,
        70,
        76
      ],
      "accounts": [
        {
          "name": "bidder",
          "writable": true,
          "signer": true
        },
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        },
        {
          "name": "bid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              },
              {
                "kind": "account",
                "path": "bidder"
              }
            ]
          }
        },
        {
          "name": "runtime",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  117,
                  110,
                  116,
                  105,
                  109,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "auctionId",
          "type": "u64"
        },
        {
          "name": "commitment",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "commitRuntime",
      "discriminator": [
        191,
        122,
        5,
        4,
        210,
        66,
        82,
        31
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "runtime",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  117,
                  110,
                  116,
                  105,
                  109,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "auctionId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "computeWinnerPrivate",
      "discriminator": [
        139,
        58,
        228,
        143,
        75,
        136,
        46,
        127
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "auctionId",
          "type": "u64"
        },
        {
          "name": "winner",
          "type": "pubkey"
        },
        {
          "name": "winningPrice",
          "type": "u64"
        },
        {
          "name": "aggregateDigest",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "delegateRuntime",
      "discriminator": [
        67,
        199,
        221,
        168,
        34,
        75,
        166,
        251
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "bufferRuntime",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "runtime"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                130,
                92,
                103,
                125,
                104,
                67,
                28,
                218,
                208,
                107,
                8,
                174,
                210,
                151,
                231,
                148,
                109,
                216,
                82,
                17,
                222,
                13,
                37,
                135,
                202,
                195,
                168,
                49,
                73,
                147,
                62,
                222
              ]
            }
          }
        },
        {
          "name": "delegationRecordRuntime",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "runtime"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataRuntime",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "runtime"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "runtime",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  117,
                  110,
                  116,
                  105,
                  109,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        },
        {
          "name": "ownerProgram",
          "address": "9msixs2rRpafs5RaCbLxTeNEiZbvg5Qux3L8qENEN4JZ"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "auctionId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeAuction",
      "discriminator": [
        37,
        10,
        117,
        197,
        208,
        88,
        117,
        62
      ],
      "accounts": [
        {
          "name": "seller",
          "writable": true,
          "signer": true
        },
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        },
        {
          "name": "runtime",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  117,
                  110,
                  116,
                  105,
                  109,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "auctionId",
          "type": "u64"
        },
        {
          "name": "biddingStart",
          "type": "i64"
        },
        {
          "name": "commitEnd",
          "type": "i64"
        },
        {
          "name": "revealEnd",
          "type": "i64"
        },
        {
          "name": "privateMode",
          "type": "bool"
        },
        {
          "name": "metadataUri",
          "type": "string"
        }
      ]
    },
    {
      "name": "processUndelegation",
      "discriminator": [
        196,
        28,
        41,
        206,
        48,
        37,
        51,
        167
      ],
      "accounts": [
        {
          "name": "baseAccount",
          "writable": true
        },
        {
          "name": "buffer"
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "accountSeeds",
          "type": {
            "vec": "bytes"
          }
        }
      ]
    },
    {
      "name": "revealBid",
      "discriminator": [
        48,
        73,
        28,
        255,
        202,
        126,
        236,
        196
      ],
      "accounts": [
        {
          "name": "bidder",
          "writable": true,
          "signer": true
        },
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        },
        {
          "name": "bid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              },
              {
                "kind": "account",
                "path": "bidder"
              }
            ]
          }
        },
        {
          "name": "runtime",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  117,
                  110,
                  116,
                  105,
                  109,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "auctionId",
          "type": "u64"
        },
        {
          "name": "bidAmount",
          "type": "u64"
        },
        {
          "name": "salt",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "settleAuction",
      "discriminator": [
        246,
        196,
        183,
        98,
        222,
        139,
        46,
        133
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        },
        {
          "name": "seller",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "auctionId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "settlePrivate",
      "discriminator": [
        220,
        119,
        140,
        233,
        54,
        178,
        252,
        237
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        },
        {
          "name": "seller",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "auctionId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "startReveal",
      "discriminator": [
        53,
        233,
        172,
        216,
        107,
        91,
        161,
        239
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "auctionId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "submitEncryptedBid",
      "discriminator": [
        79,
        24,
        114,
        130,
        197,
        38,
        79,
        99
      ],
      "accounts": [
        {
          "name": "bidder",
          "writable": true,
          "signer": true
        },
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        },
        {
          "name": "bidCipher",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100,
                  95,
                  99,
                  105,
                  112,
                  104,
                  101,
                  114
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              },
              {
                "kind": "account",
                "path": "bidder"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "auctionId",
          "type": "u64"
        },
        {
          "name": "ciphertext",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "undelegateRuntime",
      "discriminator": [
        117,
        183,
        58,
        246,
        102,
        117,
        199,
        168
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "runtime",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  117,
                  110,
                  116,
                  105,
                  109,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "auctionId",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "auctionConfig",
      "discriminator": [
        195,
        54,
        8,
        51,
        28,
        231,
        33,
        142
      ]
    },
    {
      "name": "auctionRuntime",
      "discriminator": [
        73,
        190,
        81,
        217,
        68,
        143,
        16,
        68
      ]
    },
    {
      "name": "bidCiphertext",
      "discriminator": [
        31,
        72,
        220,
        67,
        56,
        104,
        63,
        112
      ]
    },
    {
      "name": "bidCommitment",
      "discriminator": [
        22,
        176,
        22,
        172,
        16,
        35,
        239,
        176
      ]
    }
  ],
  "events": [
    {
      "name": "auctionInitialized",
      "discriminator": [
        18,
        7,
        64,
        239,
        134,
        184,
        173,
        108
      ]
    },
    {
      "name": "auctionSettled",
      "discriminator": [
        61,
        151,
        131,
        170,
        95,
        203,
        219,
        147
      ]
    },
    {
      "name": "bidCommitted",
      "discriminator": [
        81,
        13,
        193,
        139,
        0,
        168,
        82,
        55
      ]
    },
    {
      "name": "bidRevealed",
      "discriminator": [
        227,
        144,
        125,
        229,
        28,
        109,
        18,
        209
      ]
    },
    {
      "name": "phaseChanged",
      "discriminator": [
        178,
        201,
        67,
        222,
        208,
        36,
        213,
        219
      ]
    },
    {
      "name": "privateWinnerComputed",
      "discriminator": [
        178,
        17,
        140,
        47,
        32,
        212,
        110,
        210
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "auctionNotInitialized",
      "msg": "Auction not initialized"
    },
    {
      "code": 6001,
      "name": "auctionPhaseMismatch",
      "msg": "Wrong auction phase"
    },
    {
      "code": 6002,
      "name": "commitWindowClosed",
      "msg": "Commit window closed"
    },
    {
      "code": 6003,
      "name": "revealWindowClosed",
      "msg": "Reveal window closed"
    },
    {
      "code": 6004,
      "name": "commitmentMismatch",
      "msg": "Commitment does not match reveal"
    },
    {
      "code": 6005,
      "name": "bidAlreadyCommitted",
      "msg": "Bid already committed"
    },
    {
      "code": 6006,
      "name": "bidAlreadyRevealed",
      "msg": "Bid already revealed"
    },
    {
      "code": 6007,
      "name": "revealNotAllowed",
      "msg": "Reveal not allowed yet"
    },
    {
      "code": 6008,
      "name": "insufficientFundsForDeposit",
      "msg": "Insufficient funds for deposit"
    },
    {
      "code": 6009,
      "name": "settlementTooEarly",
      "msg": "Settlement too early"
    },
    {
      "code": 6010,
      "name": "alreadySettled",
      "msg": "Auction already settled"
    },
    {
      "code": 6011,
      "name": "bidOutOfRange",
      "msg": "Bid amount out of range"
    },
    {
      "code": 6012,
      "name": "noRevealedBids",
      "msg": "No revealed bids to settle"
    },
    {
      "code": 6013,
      "name": "saltTooLong",
      "msg": "Salt too long"
    },
    {
      "code": 6014,
      "name": "invalidMint",
      "msg": "Invalid token mint"
    },
    {
      "code": 6015,
      "name": "privateModeMismatch",
      "msg": "Private mode mismatch"
    },
    {
      "code": 6016,
      "name": "ciphertextTooLong",
      "msg": "Encrypted ciphertext too long"
    },
    {
      "code": 6017,
      "name": "winnerNotComputed",
      "msg": "Winner not computed yet"
    },
    {
      "code": 6018,
      "name": "aggregateMismatch",
      "msg": "Ciphertext aggregate digest does not match on-chain bids"
    },
    {
      "code": 6019,
      "name": "metadataUriTooLong",
      "msg": "Metadata URI too long"
    }
  ],
  "types": [
    {
      "name": "auctionConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "auctionId",
            "type": "u64"
          },
          {
            "name": "phase",
            "type": "u8"
          },
          {
            "name": "biddingStart",
            "type": "i64"
          },
          {
            "name": "commitEnd",
            "type": "i64"
          },
          {
            "name": "revealEnd",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "leaderBidder",
            "docs": [
              "Leader during reveal (first-price)."
            ],
            "type": "pubkey"
          },
          {
            "name": "leaderBid",
            "type": "u64"
          },
          {
            "name": "winner",
            "type": "pubkey"
          },
          {
            "name": "winningPrice",
            "type": "u64"
          },
          {
            "name": "resultHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "commitCount",
            "type": "u32"
          },
          {
            "name": "revealCount",
            "type": "u32"
          },
          {
            "name": "privateMode",
            "type": "bool"
          },
          {
            "name": "teeWinnerReady",
            "docs": [
              "TEE stage: computed before settle_private."
            ],
            "type": "bool"
          },
          {
            "name": "metadataUri",
            "docs": [
              "IPFS gateway URL for listing JSON (`title`, `description`, `image`)."
            ],
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "auctionInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "type": "u64"
          },
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "privateMode",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "auctionRuntime",
      "docs": [
        "Delegated ER mirror for realtime UI (leader synced from AuctionConfig on base in reveal_bid)."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "type": "u64"
          },
          {
            "name": "leaderBid",
            "type": "u64"
          },
          {
            "name": "leaderBidder",
            "type": "pubkey"
          },
          {
            "name": "commitCount",
            "type": "u32"
          },
          {
            "name": "revealCount",
            "type": "u32"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "auctionSettled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "type": "u64"
          },
          {
            "name": "winner",
            "type": "pubkey"
          },
          {
            "name": "winningPrice",
            "type": "u64"
          },
          {
            "name": "resultHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "bidCiphertext",
      "docs": [
        "Private mode: encrypted bid payload (permissioned flow in TEE)."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "type": "u64"
          },
          {
            "name": "bidder",
            "type": "pubkey"
          },
          {
            "name": "ciphertext",
            "type": {
              "array": [
                "u8",
                256
              ]
            }
          },
          {
            "name": "ciphertextLen",
            "type": "u16"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "bidCommitment",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "type": "u64"
          },
          {
            "name": "bidder",
            "type": "pubkey"
          },
          {
            "name": "commitment",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "revealed",
            "type": "bool"
          },
          {
            "name": "bidAmount",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "bidCommitted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "type": "u64"
          },
          {
            "name": "bidder",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "bidRevealed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "type": "u64"
          },
          {
            "name": "bidder",
            "type": "pubkey"
          },
          {
            "name": "bidAmount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "phaseChanged",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "type": "u64"
          },
          {
            "name": "newPhase",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "privateWinnerComputed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auctionId",
            "type": "u64"
          },
          {
            "name": "winner",
            "type": "pubkey"
          },
          {
            "name": "winningPrice",
            "type": "u64"
          },
          {
            "name": "resultHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    }
  ]
};

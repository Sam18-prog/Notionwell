/**
 * lib/demoData.ts
 * Notionwell — Preloaded Interactive Guest Demo Data
 * Subject: Computer Networks
 * 
 * Includes:
 * - 3 Full Sample Decks
 * - 30 High-Quality Educational Flashcards
 * - 2 Complete Interactive Quizzes (5 questions each)
 * - 1 Comprehensive Timed Mock Exam (10 questions)
 * - Sample Performance & Progress Metrics
 * 
 * Pure static client-side educational data. Zero external API calls to Gemini.
 * Fully isolated from authenticated Supabase user records.
 */

import { Deck, Subject, Flashcard, QuizQuestion } from './app';

export const DEMO_STORAGE_KEY_DECKS = 'notionwell_demo_decks_v1';
export const DEMO_STORAGE_KEY_QUIZZES = 'notionwell_demo_quizzes_v1';
export const DEMO_STORAGE_KEY_EXAM = 'notionwell_demo_exam_v1';
export const DEMO_STORAGE_KEY_STATS = 'notionwell_demo_stats_v1';
export const DEMO_SESSION_COOKIE = 'notionwell_demo_session=1';

export const DEMO_SUBJECT: Subject = {
  id: 'subject-computer-networks',
  name: 'Computer Networks',
  colorTag: '#2563EB',
  icon: 'Network',
  createdAt: '2026-01-01T00:00:00.000Z',
};

export const DEMO_DECKS: Deck[] = [
  {
    id: 'demo-deck-osi-model',
    subjectId: 'subject-computer-networks',
    name: 'Network Fundamentals & OSI Model',
    createdAt: '2026-01-02T10:00:00.000Z',
    sourceType: 'text',
    summary: [
      'Comprehensive breakdown of the 7-layer ISO/OSI Reference Architecture.',
      'Data encapsulation, protocol data units (PDUs), and hardware vs logical addressing.',
      'Comparison of collision domains, broadcast domains, and duplex transmission modes.',
    ],
    flashcards: [
      {
        id: 'card-osi-1',
        deckId: 'demo-deck-osi-model',
        question: 'What is the primary responsibility of the Physical Layer (Layer 1)?',
        answer: 'Transmission and reception of raw unstructured bit streams over physical transmission mediums (copper wire, fiber optics, radio frequencies), specifying pinouts, voltages, and cable specifications.',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 2,
        timesIncorrect: 0,
        topic: 'Physical Layer',
        masteryLevel: 'mastered',
        correctReviewCount: 2,
      },
      {
        id: 'card-osi-2',
        deckId: 'demo-deck-osi-model',
        question: 'How does the Data Link Layer (Layer 2) ensure reliable node-to-node transfer?',
        answer: 'Packages bits into frames, performs physical hardware (MAC) addressing, detects transmission errors using CRC (Cyclic Redundancy Check), and manages access to the physical link via MAC sublayer.',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 1,
        timesIncorrect: 0,
        topic: 'Data Link Layer',
        masteryLevel: 'learning',
        correctReviewCount: 1,
      },
      {
        id: 'card-osi-3',
        deckId: 'demo-deck-osi-model',
        question: 'What is the core function of the Network Layer (Layer 3)?',
        answer: 'Logical addressing (IPv4/IPv6), packet routing, and best-path determination across interconnected heterogeneous networks using routing protocols like OSPF and BGP.',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 2,
        timesIncorrect: 0,
        topic: 'Network Layer',
        masteryLevel: 'mastered',
        correctReviewCount: 2,
      },
      {
        id: 'card-osi-4',
        deckId: 'demo-deck-osi-model',
        question: 'How does the Transport Layer (Layer 4) manage end-to-end communication?',
        answer: 'Segments application data, tracks communication streams using Port numbers (process-to-process addressing), and provides either reliable connection-oriented delivery (TCP) or fast connectionless delivery (UDP).',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 1,
        timesIncorrect: 1,
        topic: 'Transport Layer',
        masteryLevel: 'learning',
        correctReviewCount: 1,
      },
      {
        id: 'card-osi-5',
        deckId: 'demo-deck-osi-model',
        question: 'What is the specific role of the Session Layer (Layer 5)?',
        answer: 'Establishes, maintains, synchronizes, and terminates dialog sessions between communicating applications, handling checkpointing and recovery of interrupted exchanges.',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 0,
        timesIncorrect: 0,
        topic: 'Session Layer',
        masteryLevel: 'new',
        correctReviewCount: 0,
      },
      {
        id: 'card-osi-6',
        deckId: 'demo-deck-osi-model',
        question: 'Which operations are handled by the Presentation Layer (Layer 6)?',
        answer: 'Data syntax translation, character encoding (ASCII, Unicode), data compression, and cryptographic encryption/decryption (TLS/SSL) to present readable data to the application layer.',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 0,
        timesIncorrect: 0,
        topic: 'Presentation Layer',
        masteryLevel: 'new',
        correctReviewCount: 0,
      },
      {
        id: 'card-osi-7',
        deckId: 'demo-deck-osi-model',
        question: 'Define the purpose and scope of the Application Layer (Layer 7).',
        answer: 'Provides network services directly to user applications and software processes (e.g. HTTP for web browsing, SMTP for email, DNS for name resolution, SSH for remote administration).',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 1,
        timesIncorrect: 0,
        topic: 'Application Layer',
        masteryLevel: 'learning',
        correctReviewCount: 1,
      },
      {
        id: 'card-osi-8',
        deckId: 'demo-deck-osi-model',
        question: 'What occurs during Protocol Data Unit (PDU) Encapsulation?',
        answer: 'As data moves down the protocol stack, each layer prepends a specialized header (and Layer 2 adds a trailer), converting Data → Segments (L4) → Packets (L3) → Frames (L2) → Bits (L1).',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 2,
        timesIncorrect: 0,
        topic: 'Encapsulation',
        masteryLevel: 'mastered',
        correctReviewCount: 2,
      },
      {
        id: 'card-osi-9',
        deckId: 'demo-deck-osi-model',
        question: 'What is the difference between a Collision Domain and a Broadcast Domain?',
        answer: 'A collision domain (isolated by Layer 2 switches) is a segment where packet collisions can occur. A broadcast domain (isolated by Layer 3 routers) includes all nodes that receive layer 2 broadcast frames (FF:FF:FF:FF:FF:FF).',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 1,
        timesIncorrect: 0,
        topic: 'Network Segmentation',
        masteryLevel: 'learning',
        correctReviewCount: 1,
      },
      {
        id: 'card-osi-10',
        deckId: 'demo-deck-osi-model',
        question: 'Differentiate Full-Duplex from Half-Duplex transmission modes.',
        answer: 'Half-duplex allows data transmission in both directions, but only one direction at a time (sharing bandwidth, prone to collisions, e.g. hubs). Full-duplex allows simultaneous bidirectional transmission over dedicated pairs.',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 0,
        timesIncorrect: 0,
        topic: 'Transmission Modes',
        masteryLevel: 'new',
        correctReviewCount: 0,
      },
    ],
    quizQuestions: [
      {
        id: 'quiz-osi-q1',
        question: 'Which OSI layer is responsible for logical IP addressing and path determination across networks?',
        options: [
          'Data Link Layer (Layer 2)',
          'Network Layer (Layer 3)',
          'Transport Layer (Layer 4)',
          'Physical Layer (Layer 1)',
        ],
        correctAnswer: 'Network Layer (Layer 3)',
        explanation: 'The Network Layer handles host-to-host logical addressing (IPv4/IPv6) and selects optimal packet routes through intermediate routers.',
        topic: 'Network Layer',
      },
      {
        id: 'quiz-osi-q2',
        question: 'What is the correct order of Protocol Data Units (PDUs) during top-down encapsulation?',
        options: [
          'Data → Packet → Segment → Frame → Bits',
          'Data → Segment → Packet → Frame → Bits',
          'Data → Frame → Segment → Packet → Bits',
          'Segment → Packet → Frame → Data → Bits',
        ],
        correctAnswer: 'Data → Segment → Packet → Frame → Bits',
        explanation: 'Application data is divided into Segments at Transport, Packets at Network, Frames at Data Link, and converted to electrical/optical Bits at Physical.',
        topic: 'Encapsulation',
      },
      {
        id: 'quiz-osi-q3',
        question: 'Which networking device breaks up both collision domains AND broadcast domains?',
        options: [
          'Network Hub (Layer 1)',
          'Ethernet Switch (Layer 2)',
          'Router (Layer 3)',
          'Wireless Access Point',
        ],
        correctAnswer: 'Router (Layer 3)',
        explanation: 'Switches break up collision domains per port, but forward broadcasts. Routers do not forward broadcast frames by default, terminating broadcast domains.',
        topic: 'Network Segmentation',
      },
      {
        id: 'quiz-osi-q4',
        question: 'Data encryption, character encoding translation, and compression happen at which layer?',
        options: [
          'Session Layer',
          'Presentation Layer',
          'Application Layer',
          'Transport Layer',
        ],
        correctAnswer: 'Presentation Layer',
        explanation: 'The Presentation Layer (Layer 6) transforms data into a standard syntax, performing character mapping (e.g. ASCII), TLS cryptographic transformation, and compression.',
        topic: 'Presentation Layer',
      },
      {
        id: 'quiz-osi-q5',
        question: 'What is the maximum payload size (MTU) of a standard Ethernet frame before fragmentation?',
        options: [
          '512 bytes',
          '1,024 bytes',
          '1,500 bytes',
          '9,000 bytes',
        ],
        correctAnswer: '1,500 bytes',
        explanation: 'Standard Ethernet specifies a Maximum Transmission Unit (MTU) of 1,500 bytes of payload data inside the layer 2 Ethernet frame.',
        topic: 'Data Link Layer',
      },
    ],
  },
  {
    id: 'demo-deck-tcp-ip',
    subjectId: 'subject-computer-networks',
    name: 'TCP/IP Protocol Suite & Transport Layer',
    createdAt: '2026-01-03T11:00:00.000Z',
    sourceType: 'text',
    summary: [
      'In-depth mechanics of the Transmission Control Protocol (TCP) and User Datagram Protocol (UDP).',
      'The 3-way connection handshake, 4-way teardown, sequence numbers, and sliding window flow control.',
      'Congestion avoidance algorithms (AIMD, Slow Start) and common well-known socket ports.',
    ],
    flashcards: [
      {
        id: 'card-tcp-1',
        deckId: 'demo-deck-tcp-ip',
        question: 'Explain the 3 steps of the TCP connection establishment handshake.',
        answer: '1. Client sends SYN (with initial seq x); 2. Server responds with SYN-ACK (seq y, ack x+1); 3. Client sends ACK (seq x+1, ack y+1). The full-duplex virtual circuit is now established.',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 3,
        timesIncorrect: 0,
        topic: 'TCP Handshake',
        masteryLevel: 'mastered',
        correctReviewCount: 3,
      },
      {
        id: 'card-tcp-2',
        deckId: 'demo-deck-tcp-ip',
        question: 'How do TCP and UDP differ in overhead, ordering, and reliability?',
        answer: 'TCP is connection-oriented, guarantees ordered in-sequence delivery via ACKs and retransmissions, has flow/congestion control, with 20-60 byte header. UDP is connectionless, unordered, best-effort with fixed 8-byte header.',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 2,
        timesIncorrect: 0,
        topic: 'TCP vs UDP',
        masteryLevel: 'mastered',
        correctReviewCount: 2,
      },
      {
        id: 'card-tcp-3',
        deckId: 'demo-deck-tcp-ip',
        question: 'How does the TCP Sliding Window mechanism provide Flow Control?',
        answer: 'The receiver advertises its available buffer capacity in the Receive Window (rwnd) field of every ACK. The sender cannot transmit more unacknowledged bytes than rwnd, preventing receiver buffer overflow.',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 1,
        timesIncorrect: 1,
        topic: 'Flow Control',
        masteryLevel: 'learning',
        correctReviewCount: 1,
      },
      {
        id: 'card-tcp-4',
        deckId: 'demo-deck-tcp-ip',
        question: 'What is Additive Increase Multiplicative Decrease (AIMD) in TCP?',
        answer: 'A congestion control heuristic: cwnd increases linearly by 1 MSS each round trip time when no loss occurs; upon detecting packet loss via triple duplicate ACK, cwnd is cut in half multiplicatively.',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 0,
        timesIncorrect: 0,
        topic: 'Congestion Control',
        masteryLevel: 'new',
        correctReviewCount: 0,
      },
      {
        id: 'card-tcp-5',
        deckId: 'demo-deck-tcp-ip',
        question: 'Identify the default well-known port numbers for HTTP, HTTPS, DNS, and SSH.',
        answer: 'HTTP: Port 80, HTTPS: Port 443, DNS: Port 53, SSH: Port 22 (all categorized under standard IANA well-known ports 0-1023).',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 1,
        timesIncorrect: 0,
        topic: 'Port Numbers',
        masteryLevel: 'learning',
        correctReviewCount: 1,
      },
      {
        id: 'card-tcp-6',
        deckId: 'demo-deck-tcp-ip',
        question: 'What defines a network Socket and what makes it unique?',
        answer: 'A socket is the endpoint of a bidirectional communication link, defined by the concatenation of an IP address and Port number (e.g. 192.168.1.50:5432).',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 1,
        timesIncorrect: 0,
        topic: 'Sockets',
        masteryLevel: 'learning',
        correctReviewCount: 1,
      },
      {
        id: 'card-tcp-7',
        deckId: 'demo-deck-tcp-ip',
        question: 'What do TCP Sequence Numbers and Acknowledgment Numbers measure?',
        answer: 'They measure byte counts, not packet counts. The Sequence Number is the byte offset of the segment\'s first payload byte. The ACK number indicates the next contiguous byte the receiver expects to receive.',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 0,
        timesIncorrect: 0,
        topic: 'TCP Sequencing',
        masteryLevel: 'new',
        correctReviewCount: 0,
      },
      {
        id: 'card-tcp-8',
        deckId: 'demo-deck-tcp-ip',
        question: 'Explain what a TCP SYN Flood Attack is and how SYN Cookies mitigate it.',
        answer: 'Attacker sends thousands of SYN packets from spoofed IPs without sending final ACKs, filling the server\'s half-open backlog queue. SYN cookies encode connection state into the initial seq number, eliminating memory allocation until ACK returns.',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 1,
        timesIncorrect: 0,
        topic: 'Security & SYN Flood',
        masteryLevel: 'learning',
        correctReviewCount: 1,
      },
      {
        id: 'card-tcp-9',
        deckId: 'demo-deck-tcp-ip',
        question: 'Detail the 4-way handshake required for TCP Connection Teardown.',
        answer: '1. Initiator sends FIN; 2. Receiver responds with ACK (half-closed); 3. Receiver finishes sending remaining data and sends FIN; 4. Initiator sends final ACK and enters TIME_WAIT state (usually 2*MSL) to ensure final ACK was delivered.',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 2,
        timesIncorrect: 0,
        topic: 'Connection Teardown',
        masteryLevel: 'mastered',
        correctReviewCount: 2,
      },
      {
        id: 'card-tcp-10',
        deckId: 'demo-deck-tcp-ip',
        question: 'What is the purpose of the TIME_WAIT state in TCP termination?',
        answer: 'Prevents delayed duplicate segments from an old connection from being mistakenly accepted by a newly created connection on the same socket pair, and ensures the peer received the final ACK.',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 0,
        timesIncorrect: 0,
        topic: 'Connection Teardown',
        masteryLevel: 'new',
        correctReviewCount: 0,
      },
    ],
    quizQuestions: [
      {
        id: 'quiz-tcp-q1',
        question: 'During the TCP 3-way handshake, what does the server send back to the client after receiving SYN?',
        options: [
          'ACK only',
          'SYN only',
          'SYN-ACK',
          'RST',
        ],
        correctAnswer: 'SYN-ACK',
        explanation: 'The server acknowledges the client\'s initial sequence number and sends its own synchronize sequence number in a combined SYN-ACK packet.',
        topic: 'TCP Handshake',
      },
      {
        id: 'quiz-tcp-q2',
        question: 'What is the base header size of a standard UDP datagram?',
        options: [
          '8 bytes',
          '20 bytes',
          '40 bytes',
          '64 bytes',
        ],
        correctAnswer: '8 bytes',
        explanation: 'A UDP header is fixed at 8 bytes (Source Port 2B, Destination Port 2B, Length 2B, Checksum 2B), minimizing transmission latency.',
        topic: 'TCP vs UDP',
      },
      {
        id: 'quiz-tcp-q3',
        question: 'Which TCP flag is used to immediately abort and reset an invalid or unexpected connection?',
        options: [
          'FIN',
          'URG',
          'RST',
          'PSH',
        ],
        correctAnswer: 'RST',
        explanation: 'The RST (Reset) flag forcefully terminates a connection when an unrequested segment arrives or an unrecoverable error occurs.',
        topic: 'TCP Flags',
      },
      {
        id: 'quiz-tcp-q4',
        question: 'In TCP congestion control, how does the Congestion Window (cwnd) expand during Slow Start?',
        options: [
          'Linearly by 1 MSS per RTT',
          'Exponentially, doubling each RTT upon receiving ACKs',
          'Quadratically based on round trip latency',
          'Remains fixed until packet loss is detected',
        ],
        correctAnswer: 'Exponentially, doubling each RTT upon receiving ACKs',
        explanation: 'During Slow Start, cwnd increases by 1 MSS for every ACK received, causing it to double every Round Trip Time (RTT) until reaching ssthresh.',
        topic: 'Congestion Control',
      },
      {
        id: 'quiz-tcp-q5',
        question: 'Which mechanism prevents a fast sender from overrunning a slow receiver\'s buffer?',
        options: [
          'AIMD Congestion Window',
          'Sliding Window Flow Control (rwnd)',
          'Nagle\'s Algorithm',
          'Path MTU Discovery',
        ],
        correctAnswer: 'Sliding Window Flow Control (rwnd)',
        explanation: 'Flow control manages traffic between the two communicating endpoints based on the receiver\'s advertised buffer capacity (rwnd).',
        topic: 'Flow Control',
      },
    ],
  },
  {
    id: 'demo-deck-routing-dns',
    subjectId: 'subject-computer-networks',
    name: 'Routing, DNS & Application Layer Protocols',
    createdAt: '2026-01-04T12:00:00.000Z',
    sourceType: 'text',
    summary: [
      'DNS hierarchy, iterative vs recursive resolution, and record types (A, AAAA, CNAME, MX).',
      'HTTP protocol evolution from HTTP/1.1 to HTTP/2 multiplexing and HTTP/3 QUIC over UDP.',
      'Interior vs Exterior routing protocols (OSPF, BGP), DHCP configuration, NAT, and CIDR subnetting.',
    ],
    flashcards: [
      {
        id: 'card-net-1',
        deckId: 'demo-deck-routing-dns',
        question: 'Differentiate between Recursive and Iterative DNS Queries.',
        answer: 'In a recursive query, the local DNS resolver does the entire search on behalf of the client and returns the final IP. In an iterative query, queried servers return the best referral name server they know until the authoritative answer is found.',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 1,
        timesIncorrect: 0,
        topic: 'DNS Architecture',
        masteryLevel: 'learning',
        correctReviewCount: 1,
      },
      {
        id: 'card-net-2',
        deckId: 'demo-deck-routing-dns',
        question: 'How do HTTP/1.1, HTTP/2, and HTTP/3 differ in their transport mechanisms?',
        answer: 'HTTP/1.1 uses plain text over persistent TCP (suffering head-of-line blocking); HTTP/2 uses binary framing and multiplexed streams over a single TCP connection; HTTP/3 uses QUIC over UDP to eliminate TCP head-of-line blocking and speed up handshakes.',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 2,
        timesIncorrect: 0,
        topic: 'HTTP Evolution',
        masteryLevel: 'mastered',
        correctReviewCount: 2,
      },
      {
        id: 'card-net-3',
        deckId: 'demo-deck-routing-dns',
        question: 'Describe the 4 steps of the DHCP DORA configuration process.',
        answer: '1. Discover (client broadcasts looking for a server); 2. Offer (server offers available IP); 3. Request (client broadcasts acceptance of lease); 4. Acknowledge (server confirms lease parameters and gateway/DNS).',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 1,
        timesIncorrect: 0,
        topic: 'DHCP Protocol',
        masteryLevel: 'learning',
        correctReviewCount: 1,
      },
      {
        id: 'card-net-4',
        deckId: 'demo-deck-routing-dns',
        question: 'What is the role of ARP (Address Resolution Protocol) and its cache?',
        answer: 'ARP maps a known 32-bit IPv4 address to its corresponding 48-bit physical MAC address on the local broadcast link by broadcasting ARP Requests and receiving unicast ARP Replies, caching results to avoid repeated lookups.',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 1,
        timesIncorrect: 0,
        topic: 'ARP',
        masteryLevel: 'learning',
        correctReviewCount: 1,
      },
      {
        id: 'card-net-5',
        deckId: 'demo-deck-routing-dns',
        question: 'Contrast Distance-Vector (e.g. RIP) and Link-State (e.g. OSPF) routing protocols.',
        answer: 'Distance-Vector shares full routing tables only with immediate neighbors based on hop count (Bellman-Ford algorithm). Link-State floods individual link states across the whole area and builds a complete topological map using Dijkstra\'s Shortest Path First algorithm.',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 0,
        timesIncorrect: 0,
        topic: 'Routing Protocols',
        masteryLevel: 'new',
        correctReviewCount: 0,
      },
      {
        id: 'card-net-6',
        deckId: 'demo-deck-routing-dns',
        question: 'Why is BGP (Border Gateway Protocol) classified as a Path-Vector protocol?',
        answer: 'BGP operates between autonomous systems (AS) on the global internet, advertising entire lists of traversed AS numbers (AS-Path). This prevents routing loops and enables policy-based routing decisions rather than pure metrics.',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 0,
        timesIncorrect: 1,
        topic: 'BGP',
        masteryLevel: 'learning',
        correctReviewCount: 0,
      },
      {
        id: 'card-net-7',
        deckId: 'demo-deck-routing-dns',
        question: 'What is NAT and what are the RFC 1918 private IPv4 address allocations?',
        answer: 'Network Address Translation translates private internal IP addresses to public routable IPs. The standard private blocks are: 10.0.0.0/8 (Class A), 172.16.0.0/12 (Class B), and 192.168.0.0/16 (Class C).',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 1,
        timesIncorrect: 0,
        topic: 'NAT & Addressing',
        masteryLevel: 'learning',
        correctReviewCount: 1,
      },
      {
        id: 'card-net-8',
        deckId: 'demo-deck-routing-dns',
        question: 'Calculate the subnet mask and usable host count for a /26 CIDR block.',
        answer: 'A /26 prefix has 26 network bits and 6 host bits. Subnet mask = 255.255.255.192. Total addresses = 2^6 = 64; Usable host IPs = 64 - 2 (network & broadcast) = 62 usable addresses.',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 0,
        timesIncorrect: 0,
        topic: 'CIDR Subnetting',
        masteryLevel: 'new',
        correctReviewCount: 0,
      },
      {
        id: 'card-net-9',
        deckId: 'demo-deck-routing-dns',
        question: 'How does TLS 1.3 achieve faster handshake speeds compared to TLS 1.2?',
        answer: 'TLS 1.3 reduces the cryptographic handshake from 2 round trips (2-RTT) down to a single round trip (1-RTT) by sending key exchange parameters during the ClientHello, and supports 0-RTT resumption for returning clients.',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 1,
        timesIncorrect: 0,
        topic: 'TLS Cryptography',
        masteryLevel: 'learning',
        correctReviewCount: 1,
      },
      {
        id: 'card-net-10',
        deckId: 'demo-deck-routing-dns',
        question: 'How does Traceroute determine the path of intermediate router hops to a destination?',
        answer: 'Sends packets with incrementing IP Time-to-Live (TTL) values starting at 1. Each intermediate router decrements TTL to 0, drops the packet, and returns an ICMP "Time Exceeded" message, exposing the router\'s IP address.',
        difficulty: null,
        intervalDays: 0,
        nextReviewDate: '2026-11-05',
        timesReviewed: 2,
        timesIncorrect: 0,
        topic: 'ICMP Diagnostics',
        masteryLevel: 'mastered',
        correctReviewCount: 2,
      },
    ],
    quizQuestions: [
      {
        id: 'quiz-net-q1',
        question: 'Which DNS record type is specifically used to resolve a domain name into an IPv6 address?',
        options: [
          'A Record',
          'AAAA Record',
          'CNAME Record',
          'PTR Record',
        ],
        correctAnswer: 'AAAA Record',
        explanation: 'A records map domain names to 32-bit IPv4 addresses; AAAA records map domain names to 128-bit IPv6 addresses.',
        topic: 'DNS Records',
      },
      {
        id: 'quiz-net-q2',
        question: 'What underlying transport layer protocol does HTTP/3 utilize?',
        options: [
          'TCP over TLS',
          'QUIC over UDP',
          'SCTP',
          'Raw IP Sockets',
        ],
        correctAnswer: 'QUIC over UDP',
        explanation: 'HTTP/3 replaces TCP with Google\'s QUIC protocol built directly on top of UDP, offering built-in encryption and zero head-of-line blocking.',
        topic: 'HTTP/3',
      },
      {
        id: 'quiz-net-q3',
        question: 'Which routing protocol uses Dijkstra\'s algorithm to construct a shortest path tree?',
        options: [
          'RIP (Routing Information Protocol)',
          'OSPF (Open Shortest Path First)',
          'BGP (Border Gateway Protocol)',
          'EGP (Exterior Gateway Protocol)',
        ],
        correctAnswer: 'OSPF (Open Shortest Path First)',
        explanation: 'OSPF is a link-state routing protocol where each router uses Dijkstra\'s SPF algorithm to calculate the shortest path to every network destination.',
        topic: 'Routing Protocols',
      },
      {
        id: 'quiz-net-q4',
        question: 'In a /28 subnet, how many valid host IP addresses can be assigned to active devices?',
        options: [
          '16',
          '14',
          '30',
          '62',
        ],
        correctAnswer: '14',
        explanation: '32 - 28 = 4 host bits. 2^4 = 16 total addresses minus 2 reserved addresses (network ID and broadcast address) equals 14 usable host IPs.',
        topic: 'CIDR Subnetting',
      },
      {
        id: 'quiz-net-q5',
        question: 'What is the primary exterior gateway protocol used for routing between Autonomous Systems on the Internet?',
        options: [
          'BGP',
          'OSPF',
          'IS-IS',
          'IGRP',
        ],
        correctAnswer: 'BGP',
        explanation: 'Border Gateway Protocol (BGP-4) is the de facto standardized exterior gateway routing protocol that glues the global Internet together.',
        topic: 'BGP',
      },
    ],
  },
];

export interface DemoExamQuestion {
  id: string;
  questionIndex: number;
  questionType: 'mcq' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  topic: string;
  points: number;
}

export interface DemoExam {
  id: string;
  title: string;
  subjectName: string;
  timeLimitMinutes: number;
  totalQuestions: number;
  totalPoints: number;
  passingPercentage: number;
  questions: DemoExamQuestion[];
}

export const DEMO_MOCK_EXAM: DemoExam = {
  id: 'demo-exam-cn-101',
  title: 'Computer Networks Comprehensive Midterm Assessment',
  subjectName: 'Computer Networks',
  timeLimitMinutes: 15,
  totalQuestions: 10,
  totalPoints: 10,
  passingPercentage: 70,
  questions: [
    {
      id: 'q1',
      questionIndex: 1,
      questionType: 'mcq',
      question: 'Which layer of the OSI model is responsible for converting human-readable data into standardized encrypted syntax (e.g., TLS encryption)?',
      options: ['Application Layer', 'Presentation Layer', 'Session Layer', 'Transport Layer'],
      correctAnswer: 'Presentation Layer',
      explanation: 'Layer 6 (Presentation) formats, translates, compresses, and encrypts data for application presentation.',
      topic: 'OSI Model',
      points: 1,
    },
    {
      id: 'q2',
      questionIndex: 2,
      questionType: 'mcq',
      question: 'What is the primary role of the 3-way TCP handshake before application data transmission begins?',
      options: [
        'To negotiate encryption keys',
        'To synchronize sequence numbers and establish buffer parameters',
        'To authenticate the client username and password',
        'To resolve the server\'s MAC address',
      ],
      correctAnswer: 'To synchronize sequence numbers and establish buffer parameters',
      explanation: 'SYN and ACK packets exchange Initial Sequence Numbers (ISNs) and confirm both sides are ready to receive data.',
      topic: 'TCP Handshake',
      points: 1,
    },
    {
      id: 'q3',
      questionIndex: 3,
      questionType: 'true_false',
      question: 'A network switch operating at Layer 2 breaks up both collision domains and broadcast domains.',
      options: ['True', 'False'],
      correctAnswer: 'False',
      explanation: 'False. A Layer 2 switch isolates collision domains per port, but forwards broadcast frames to all ports within the VLAN (it does NOT break up broadcast domains; routers do).',
      topic: 'Network Segmentation',
      points: 1,
    },
    {
      id: 'q4',
      questionIndex: 4,
      questionType: 'mcq',
      question: 'Which of the following RFC 1918 blocks represents a private Class B IPv4 network?',
      options: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '169.254.0.0/16'],
      correctAnswer: '172.16.0.0/12',
      explanation: '172.16.0.0/12 covers private IPs from 172.16.0.0 to 172.31.255.255.',
      topic: 'IP Addressing',
      points: 1,
    },
    {
      id: 'q5',
      questionIndex: 5,
      questionType: 'mcq',
      question: 'During HTTP/3 communication, what protocol provides the underlying transport layer mechanics?',
      options: ['TCP with TLS 1.3', 'QUIC over UDP', 'SCTP over IP', 'Pure WebSocket'],
      correctAnswer: 'QUIC over UDP',
      explanation: 'HTTP/3 operates over QUIC, which runs on top of UDP to eliminate TCP head-of-line blocking.',
      topic: 'Application Protocols',
      points: 1,
    },
    {
      id: 'q6',
      questionIndex: 6,
      questionType: 'true_false',
      question: 'In TCP flow control, the sender will reduce its transmission rate if the receiver\'s advertised window (rwnd) becomes smaller.',
      options: ['True', 'False'],
      correctAnswer: 'True',
      explanation: 'True. The receiver uses the rwnd field in ACK headers to inform the sender how much buffer capacity remains, throttling transmission to prevent buffer overflow.',
      topic: 'Flow Control',
      points: 1,
    },
    {
      id: 'q7',
      questionIndex: 7,
      questionType: 'mcq',
      question: 'How many usable host IP addresses are provided by a /27 subnet mask?',
      options: ['32', '30', '28', '14'],
      correctAnswer: '30',
      explanation: '32 - 27 = 5 host bits. 2^5 = 32 total addresses minus 2 (network & broadcast) = 30 usable hosts.',
      topic: 'CIDR Subnetting',
      points: 1,
    },
    {
      id: 'q8',
      questionIndex: 8,
      questionType: 'mcq',
      question: 'What is the purpose of the TTL (Time-To-Live) field in an IPv4 packet header?',
      options: [
        'To measure connection round trip time',
        'To prevent packets from circulating endlessly in a routing loop',
        'To timestamp when the packet was created',
        'To reserve bandwidth on intermediate routers',
      ],
      correctAnswer: 'To prevent packets from circulating endlessly in a routing loop',
      explanation: 'Each router decrements TTL by 1. When TTL reaches 0, the packet is discarded and an ICMP Time Exceeded message is returned, preventing infinite routing loops.',
      topic: 'IPv4 Header',
      points: 1,
    },
    {
      id: 'q9',
      questionIndex: 9,
      questionType: 'short_answer',
      question: 'What protocol does a client use to resolve a known local IPv4 address into its physical MAC address?',
      correctAnswer: 'Address Resolution Protocol (ARP)',
      explanation: 'ARP (Address Resolution Protocol) broadcasts on the local link to find which physical hardware MAC corresponds to a target IP.',
      topic: 'Data Link Layer',
      points: 1,
    },
    {
      id: 'q10',
      questionIndex: 10,
      questionType: 'short_answer',
      question: 'In DNS resolution, what specific record type maps an alias or canonical domain name to another domain name?',
      correctAnswer: 'CNAME (Canonical Name)',
      explanation: 'A CNAME (Canonical Name) record aliases one domain name to another canonical domain.',
      topic: 'DNS Records',
      points: 1,
    },
  ],
};

export interface DemoAnalyticsReport {
  overview: {
    totalStudyHours: number;
    totalStudyHoursFormatted: string;
    totalFlashcardsReviewed: number;
    totalQuizzesAttempted: number;
    totalExamsCompleted: number;
    overallAccuracy: number;
    currentStreakDays: number;
    totalXP: number;
    currentLevel: number;
    levelTitle: string;
    masteryPercentage: number;
  };
  deckMastery: Array<{
    deckId: string;
    deckName: string;
    cardCount: number;
    masteredCount: number;
    learningCount: number;
    newCount: number;
    masteryPercent: number;
  }>;
  weakTopics: string[];
  recommendations: Array<{
    type: string;
    title: string;
    description: string;
    actionLabel: string;
    actionUrl: string;
  }>;
}

export const DEMO_ANALYTICS: DemoAnalyticsReport = {
  overview: {
    totalStudyHours: 42.5,
    totalStudyHoursFormatted: '42h 30m',
    totalFlashcardsReviewed: 30,
    totalQuizzesAttempted: 2,
    totalExamsCompleted: 1,
    overallAccuracy: 86.5,
    currentStreakDays: 7,
    totalXP: 1250,
    currentLevel: 4,
    levelTitle: 'Network Architect',
    masteryPercentage: 68,
  },
  deckMastery: [
    {
      deckId: 'demo-deck-osi-model',
      deckName: 'Network Fundamentals & OSI Model',
      cardCount: 10,
      masteredCount: 4,
      learningCount: 3,
      newCount: 3,
      masteryPercent: 70,
    },
    {
      deckId: 'demo-deck-tcp-ip',
      deckName: 'TCP/IP Protocol Suite & Transport Layer',
      cardCount: 10,
      masteredCount: 5,
      learningCount: 3,
      newCount: 2,
      masteryPercent: 75,
    },
    {
      deckId: 'demo-deck-routing-dns',
      deckName: 'Routing, DNS & Application Layer Protocols',
      cardCount: 10,
      masteredCount: 3,
      learningCount: 4,
      newCount: 3,
      masteryPercent: 60,
    },
  ],
  weakTopics: [
    'BGP Path-Vector Loop Prevention',
    'CIDR /26 Subnet Mask Calculation',
    'TCP Congestion Window AIMD Transitions',
  ],
  recommendations: [
    {
      type: 'spaced_repetition',
      title: 'Review Due Cards: Routing & DNS Protocols',
      description: 'Your SM-2 memory retention curve suggests reviewing 4 cards in Routing & DNS today to cement long-term memory.',
      actionLabel: 'Start Review Session',
      actionUrl: '/demo?tab=flashcards&deck=demo-deck-routing-dns',
    },
    {
      type: 'quiz_challenge',
      title: 'Strengthen Weak Topic: Subnet Masking',
      description: 'Practice 5 rapid-fire CIDR calculation questions to bring your subnetting accuracy from 60% up to 90%.',
      actionLabel: 'Take Practice Quiz',
      actionUrl: '/demo?tab=quizzes',
    },
    {
      type: 'exam_prep',
      title: 'Take Computer Networks Midterm Simulation',
      description: 'Test your understanding under a 15-minute countdown clock with realistic grading.',
      actionLabel: 'Launch Mock Exam',
      actionUrl: '/demo?tab=exam',
    },
  ],
};

/**
 * Helper to retrieve local demo decks with user modifications (known/learning states)
 */
export function getStoredDemoDecks(): Deck[] {
  if (typeof window === 'undefined') return DEMO_DECKS;
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY_DECKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEMO_DECKS;
}

/**
 * Save updated demo decks to localStorage
 */
export function saveStoredDemoDecks(decks: Deck[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEMO_STORAGE_KEY_DECKS, JSON.stringify(decks));
  } catch {}
}

/**
 * Reset demo state back to the fresh pristine Computer Networks baseline
 */
export function resetDemoState(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DEMO_STORAGE_KEY_DECKS);
    localStorage.removeItem(DEMO_STORAGE_KEY_QUIZZES);
    localStorage.removeItem(DEMO_STORAGE_KEY_EXAM);
    localStorage.removeItem(DEMO_STORAGE_KEY_STATS);
    // Ensure cookie is set
    document.cookie = 'notionwell_demo_session=1; path=/; max-age=86400; SameSite=Lax';
    window.dispatchEvent(new Event('demo-reset'));
  } catch {}
}

/**
 * Check if the current browser session is running in guest demo mode
 */
export function isDemoSession(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.includes('notionwell_demo_session=1');
}

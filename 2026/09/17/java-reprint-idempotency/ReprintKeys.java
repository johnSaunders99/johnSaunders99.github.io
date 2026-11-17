import java.sql.*;
import java.util.UUID;
import java.util.concurrent.*;

public class ReprintKeys {
    static final String DB = "jdbc:h2:mem:reprint";
    record Request(String tenant, String key, String bill, int copies) {}
    record Job(UUID id, String bill, int copies) {}
    record Reply(int status, UUID jobId) {}

    // Each INSERT is one auto-committed transaction. No pre-read is required.
    static Reply submit(Connection db, Request r) throws SQLException {
        UUID id = UUID.randomUUID();
        try (var q = db.prepareStatement("""
                INSERT INTO reprint_job (job_id, tenant_id, request_key, bill_ref, copies)
                VALUES (?, ?, ?, ?, ?)
                """)) {
            q.setObject(1, id);
            q.setString(2, r.tenant());
            q.setString(3, r.key());
            q.setString(4, r.bill());
            q.setInt(5, r.copies());
            q.executeUpdate();
            return new Reply(201, id);
        } catch (SQLException e) {
            if (!"23505".equals(e.getSQLState())) throw e;
            Job old = find(db, r);
            if (old == null) throw e; // Not a duplicate of this request.
            if (!old.bill().equals(r.bill()) || old.copies() != r.copies())
                return new Reply(409, null);
            return new Reply(200, old.id());
        }
    }

    static Job find(Connection db, Request r) throws SQLException {
        try (var q = db.prepareStatement("""
                SELECT job_id, bill_ref, copies FROM reprint_job
                WHERE tenant_id = ? AND request_key = ?
                """)) {
            q.setString(1, r.tenant());
            q.setString(2, r.key());
            try (var rows = q.executeQuery()) {
                return rows.next() ? new Job(rows.getObject(1, UUID.class),
                        rows.getString(2), rows.getInt(3)) : null;
            }
        }
    }

    static int count(Connection db, String tenant) throws SQLException {
        try (var q = db.prepareStatement("SELECT COUNT(*) FROM reprint_job WHERE tenant_id = ?")) {
            q.setString(1, tenant);
            try (var rows = q.executeQuery()) {
                rows.next();
                return rows.getInt(1);
            }
        }
    }

    record Attempt(boolean sawEmpty, Reply reply) {}

    static void race(Connection reader) throws Exception {
        var r = new Request("west", "R-7", "B-17", 1);
        var gate = new CyclicBarrier(2);
        Callable<Attempt> contender = () -> {
            try (var db = DriverManager.getConnection(DB)) {
                boolean empty = find(db, r) == null;
                gate.await(10, TimeUnit.SECONDS); // Both reads finish before either insert.
                return new Attempt(empty, submit(db, r));
            }
        };
        try (var pool = Executors.newFixedThreadPool(2)) {
            var a = pool.submit(contender);
            var b = pool.submit(contender);
            var x = a.get(); var y = b.get();
            int low = Math.min(x.reply().status(), y.reply().status());
            int high = Math.max(x.reply().status(), y.reply().status());
            boolean empty = x.sawEmpty() && y.sawEmpty();
            boolean same = x.reply().jobId().equals(y.reply().jobId());
            int n = count(reader, r.tenant());
            System.out.printf("race: bothSawEmpty=%s status=%d/%d sameJob=%s jobs=%d%n",
                    empty, low, high, same, n);
            check(empty && low == 200 && high == 201 && same && n == 1);
        }
    }

    static void check(boolean ok) {
        if (!ok) throw new AssertionError("Unexpected business outcome");
    }

    public static void main(String[] args) throws Exception {
        try (var db = DriverManager.getConnection(DB); var schema = db.createStatement()) {
            schema.execute("""
                    CREATE TABLE reprint_job (
                        job_id UUID PRIMARY KEY,
                        tenant_id VARCHAR(64) NOT NULL,
                        request_key VARCHAR(80) NOT NULL,
                        bill_ref VARCHAR(80) NOT NULL,
                        copies INT NOT NULL CHECK (copies > 0),
                        UNIQUE (tenant_id, request_key)
                    )
                    """);
            var r = new Request("east", "R-7", "B-17", 1);
            var first = submit(db, r);
            int n = count(db, "east");
            System.out.printf("first: status=%d jobs=%d%n", first.status(), n);
            check(first.status() == 201 && n == 1);

            var replay = submit(db, r); // Client retries without knowing the first job ID.
            boolean same = first.jobId().equals(replay.jobId());
            n = count(db, "east");
            System.out.printf("retry: status=%d sameJob=%s jobs=%d%n", replay.status(), same, n);
            check(replay.status() == 200 && same && n == 1);

            var changed = submit(db, new Request("east", "R-7", "B-17", 2));
            int copies = find(db, r).copies();
            n = count(db, "east");
            System.out.printf("changed: status=%d storedCopies=%d jobs=%d%n", changed.status(), copies, n);
            check(changed.status() == 409 && copies == 1 && n == 1);

            var next = submit(db, new Request("east", "R-8", "B-17", 1));
            boolean distinct = !first.jobId().equals(next.jobId());
            n = count(db, "east");
            System.out.printf("new-key: status=%d newJob=%s jobs=%d%n", next.status(), distinct, n);
            check(next.status() == 201 && distinct && n == 2);
            race(db);
        }
    }
}

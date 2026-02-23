const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Database...");
  
  // 1. Create Users
  const alice = await prisma.user.create({
    data: { email: 'alice@example.com', januaId: 'auth0|alice', socialBattery: 80 }
  });
  const bob = await prisma.user.create({
    data: { email: 'bob@example.com', januaId: 'auth0|bob', socialBattery: 65 }
  });
  const charlie = await prisma.user.create({
    data: { email: 'charlie@example.com', januaId: 'auth0|charlie', socialBattery: 90 }
  });

  // 2. Create Groups
  const householdGroup = await prisma.group.create({
    data: {
      name: 'The Household',
      memberships: {
        create: [
          { userId: alice.id, role: 'ADMIN' },
          { userId: bob.id, role: 'MEMBER' }
        ]
      }
    }
  });

  const friendsGroup = await prisma.group.create({
    data: {
      name: 'Game Night Friends',
      memberships: {
        create: [
          { userId: alice.id, role: 'ADMIN' },
          { userId: charlie.id, role: 'MEMBER' }
        ]
      }
    }
  });

  // 3. Create an Event with a "Busy Broadcast"
  const event = await prisma.event.create({
    data: {
      hostId: alice.id,
      groupId: householdGroup.id,
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000), // + 1 hour
      minTrustLayer: 'INNER_CIRCLE',
      broadcastBusy: true,
      encryptedPayload: 'encrypted_base64_blob_here'
    }
  });

  console.log("Seeding Complete!");
  console.log("Users:", { alice: alice.id, bob: bob.id, charlie: charlie.id });
  console.log("Groups:", { household: householdGroup.id, friends: friendsGroup.id });
  console.log("Event:", event.id);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

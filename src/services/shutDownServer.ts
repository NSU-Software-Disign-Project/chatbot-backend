export const shutdownServer = async (server: any, prisma: any) => {
    await prisma.$disconnect();
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
};
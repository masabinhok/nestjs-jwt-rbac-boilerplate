import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { User, Prisma } from 'generated/prisma/client';
import { UpdateUserDto } from './dtos/update-user.dto';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService){}

    async getProfile(userId: string) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId },
        })

        return this.sanitizeUser(user);
    }

    async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { ...updateProfileDto },
        })
        return this.sanitizeUser(updatedUser);
    }


    // admin methods
    async getAllUsers() {
        const users = await this.prisma.user.findMany({
            where: {
                 isActive: true
            }
        })
        const sanitizedUsers = users.map(user => this.sanitizeUser(user));
        return sanitizedUsers;
    }

    async getUserById(userId: string) {
        if(!userId){
            return null;
        }
        const user =  await this.prisma.user.findUnique({
            where: { id: userId },
        })
        if(!user){
            return null;
        }
        return this.sanitizeUser(user);
    }

    async updateUserById(userId: string, updateUserDto: UpdateUserDto) { 
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: { ...updateUserDto },
        });

        return this.sanitizeUser(updatedUser);
    }

    async deleteUserById(userId: string) {
        await this.prisma.user.delete({
            where: { id: userId },
        });
        return { message: 'User deleted successfully' };
    }

    // utils

    sanitizeUser(user: User | null){
        if(!user){
            return null;
        }

        const {refreshToken, passwordHash, ...safeUser} = user;
        return safeUser;
    }
}

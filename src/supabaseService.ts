import { supabase } from './supabaseClient';
import { format, parseISO, addDays, isWeekend } from 'date-fns';

export const supabaseService = {
    async getMembers() {
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .order('attendance_order');
        if (error) throw error;
        return data.map(m => ({
            id: m.id,
            rollNo: m.roll_no,
            name: m.name,
            order: m.attendance_order,
            photoUrl: m.photo_url
        }));
    },

    async getSchedule() {
        const { data, error } = await supabase
            .from('schedule')
            .select(`
        *,
        originalMember:members!original_member_id(name),
        currentMember:members!current_member_id(name),
        replacedByMember:members!replaced_by_id(name)
      `)
            .order('date')
            .order('id');

        if (error) throw error;

        // Get icebreakers and themes
        const [{ data: icebreakers }, { data: themes }] = await Promise.all([
            supabase.from('daily_icebreaker').select('*'),
            supabase.from('daily_theme').select('*')
        ]);

        // Map the results to match the expected structure
        return data.map(s => ({
            id: s.id,
            date: s.date,
            roleId: s.role_id,
            originalMemberId: s.original_member_id,
            currentMemberId: s.current_member_id,
            status: s.status,
            isSubstitution: s.is_substitution,
            replacedById: s.replaced_by_id,
            originalMemberName: s.originalMember?.name,
            currentMemberName: s.currentMember?.name,
            replacedByName: s.replacedByMember?.name,
            icebreaker: icebreakers?.find(i => i.date === s.date)?.game_name,
            theme: themes?.find(t => t.date === s.date)?.theme
        }));
    },

    async updateTheme(date: string, theme: string) {
        const { error } = await supabase
            .from('daily_theme')
            .upsert({ date, theme });
        if (error) throw error;
    },

    async updateIcebreaker(date: string, gameName: string) {
        const { error } = await supabase
            .from('daily_icebreaker')
            .upsert({ date, game_name: gameName });
        if (error) throw error;
    },

    async getIcebreakerBank() {
        const { data, error } = await supabase
            .from('icebreaker_bank')
            .select('*')
            .order('name');
        if (error) throw error;
        return data;
    },

    async addIcebreakerToBank(name: string, description: string) {
        const { error } = await supabase
            .from('icebreaker_bank')
            .insert({ name, description });
        if (error) throw error;
    },

    async deleteIcebreakerFromBank(id: number) {
        const { error } = await supabase
            .from('icebreaker_bank')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async getAnnouncements() {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .order('date', { ascending: false });
        if (error) throw error;
        return data;
    },

    async getQueries() {
        const { data, error } = await supabase
            .from('queries')
            .select('*')
            .order('date', { ascending: false });
        if (error) throw error;
        return data;
    },

    async submitQuery(name: string, rollNo: string, message: string) {
        const { error } = await supabase
            .from('queries')
            .insert({ name, roll_no: rollNo, message, date: format(new Date(), 'yyyy-MM-dd') });
        if (error) throw error;
    },

    async resolveQuery(id: number) {
        const { error } = await supabase
            .from('queries')
            .update({ status: 'resolved' })
            .eq('id', id);
        if (error) throw error;
    },

    async hasUndo() {
        const { count, error } = await supabase
            .from('schedule_history')
            .select('*', { count: 'exact', head: true });
        if (error) throw error;
        return (count || 0) > 0;
    },

    async markAbsent(scheduleId: number) {
        // Ported from server.ts
        const { data: entry, error: entryError } = await supabase
            .from('schedule')
            .select('*')
            .eq('id', scheduleId)
            .single();

        if (entryError || !entry) throw new Error("Entry not found");

        const todayStr = format(new Date(), 'yyyy-MM-dd');
        if (entry.date < todayStr) {
            throw new Error("Cannot modify past attendance");
        }

        if (entry.role_id.startsWith('BACKUP_')) {
            await supabase.from('schedule').update({ status: 'absent' }).eq('id', scheduleId);
            return;
        }

        const { data: backups } = await supabase
            .from('schedule')
            .select('*')
            .eq('date', entry.date)
            .in('role_id', ['BACKUP_1', 'BACKUP_2', 'BACKUP_3'])
            .order('role_id');

        let availableBackup = backups?.find(b => b.status !== 'absent');

        if (availableBackup) {
            const backupMemberId = availableBackup.original_member_id;
            const absenteeMemberId = entry.original_member_id;

            await supabase.from('schedule').update({
                current_member_id: backupMemberId,
                is_substitution: true,
                replaced_by_id: absenteeMemberId,
                status: entry.date < todayStr ? 'completed' : 'scheduled'
            }).eq('id', scheduleId);

            await supabase.from('schedule').update({ status: 'absent' }).eq('id', availableBackup.id);

            // Swap and Shift logic
            const { data: nextMeeting } = await supabase
                .from('schedule')
                .select('date')
                .gt('date', entry.date)
                .order('date')
                .limit(1)
                .single();

            if (nextMeeting) {
                const { data: backupNextRole } = await supabase
                    .from('schedule')
                    .select('id')
                    .eq('date', nextMeeting.date)
                    .eq('original_member_id', backupMemberId)
                    .single();

                if (backupNextRole) {
                    await supabase.from('schedule').update({
                        current_member_id: absenteeMemberId,
                        is_substitution: true,
                        replaced_by_id: backupMemberId
                    }).eq('id', backupNextRole.id);
                }
            }
        } else {
            await supabase.from('schedule').update({ status: 'absent' }).eq('id', scheduleId);
        }
    },

    async markPresent(scheduleId: number) {
        const { data: entry, error: entryError } = await supabase
            .from('schedule')
            .select('*')
            .eq('id', scheduleId)
            .single();

        if (entryError || !entry) throw new Error("Entry not found");

        const todayStr = format(new Date(), 'yyyy-MM-dd');
        if (entry.date < todayStr) throw new Error("Cannot modify past attendance");

        const newStatus = entry.date < todayStr ? 'completed' : 'scheduled';

        if (entry.is_substitution) {
            const backupMemberId = entry.current_member_id;
            const absenteeMemberId = entry.original_member_id;

            const { data: backupPlaceholder } = await supabase
                .from('schedule')
                .select('id')
                .eq('date', entry.date)
                .eq('original_member_id', backupMemberId)
                .like('role_id', 'BACKUP_%')
                .single();

            if (backupPlaceholder) {
                await supabase.from('schedule').update({ status: newStatus }).eq('id', backupPlaceholder.id);
            }

            const { data: nextMeeting } = await supabase
                .from('schedule')
                .select('date')
                .gt('date', entry.date)
                .order('date')
                .limit(1)
                .single();

            if (nextMeeting) {
                await supabase.from('schedule').update({
                    current_member_id: backupMemberId,
                    is_substitution: false,
                    replaced_by_id: null
                }).eq('date', nextMeeting.date).eq('original_member_id', backupMemberId);
            }
        }

        await supabase.from('schedule').update({
            current_member_id: entry.original_member_id,
            is_substitution: false,
            replaced_by_id: null,
            status: newStatus
        }).eq('id', scheduleId);
    },

    async updateSchedule(scheduleId: number, memberId: number) {
        const { error } = await supabase
            .from('schedule')
            .update({ current_member_id: memberId, is_substitution: true, replaced_by_id: memberId })
            .eq('id', scheduleId);
        if (error) throw error;
    },

    async deleteMonthSchedule(month: string, year: string) {
        const monthStr = month.padStart(2, '0');
        const start = `${year}-${monthStr}-01`;
        const end = `${year}-${monthStr}-31`; // Rough end, Supabase will handle correctly

        await supabase.from('schedule').delete().gte('date', start).lte('date', end).eq('status', 'scheduled');
        await supabase.from('daily_icebreaker').delete().gte('date', start).lte('date', end);
        await supabase.from('daily_theme').delete().gte('date', start).lte('date', end);
    },

    async generateSchedule(startDate: string) {
        // This is the most complex one. We'll need to port logic.
        // However, it involves a lot of DB reads/writes.
        // For now, let's keep it in the frontend or move it here.
        const { data: members } = await supabase.from('members').select('id').order('attendance_order');
        if (!members || members.length === 0) throw new Error("No members found");

        const { data: holidaysData } = await supabase.from('holidays').select('date');
        const holidays = holidaysData?.map(h => h.date) || [];

        const { data: existingDays } = await supabase.from('schedule').select('date', { count: 'exact', head: false });
        const uniqueDates = Array.from(new Set(existingDays?.map(d => d.date))).sort();
        let dayCount = uniqueDates.length;

        let currentDate = parseISO(startDate);
        const isStartOfMonth = currentDate.getDate() === 1;
        const daysToGenerate = isStartOfMonth ? 31 : 12;
        const targetMonth = currentDate.getMonth();

        const rolesList = [
            "TMOD", "GE", "TTM", "TIMER", "AH_COUNTER", "GRAMMARIAN",
            "SPEAKER_1", "SPEAKER_2", "SPEAKER_3",
            "EVALUATOR_1", "EVALUATOR_2", "EVALUATOR_3",
            "TT_SPEAKER_1", "TT_SPEAKER_2", "TT_SPEAKER_3",
            "BACKUP_1", "BACKUP_2", "BACKUP_3"
        ];

        const newEntries = [];

        for (let i = 0; i < daysToGenerate; i++) {
            if (isStartOfMonth && currentDate.getMonth() !== targetMonth) break;

            while (isWeekend(currentDate) || holidays.includes(format(currentDate, "yyyy-MM-dd"))) {
                currentDate = addDays(currentDate, 1);
                if (isStartOfMonth && currentDate.getMonth() !== targetMonth) break;
            }

            if (isStartOfMonth && currentDate.getMonth() !== targetMonth) break;

            const dateStr = format(currentDate, "yyyy-MM-dd");

            const { count } = await supabase.from('schedule').select('*', { count: 'exact', head: true }).eq('date', dateStr);

            if (count === 0) {
                const batchIdx = dayCount % 4;
                const cycleIdx = Math.floor(dayCount / 4);

                const setPerms = [
                    [0, 1, 2, 3, 4],
                    [4, 3, 0, 2, 1],
                    [1, 0, 3, 4, 2],
                    [2, 4, 1, 0, 3],
                    [3, 2, 4, 1, 0]
                ];

                const currentPerm = setPerms[cycleIdx % 5];
                const batchMembers = members.slice(batchIdx * 15, (batchIdx + 1) * 15);

                if (batchMembers.length < 15) {
                    rolesList.forEach((roleId, rIdx) => {
                        const member = members[(dayCount * 15 + rIdx) % members.length];
                        newEntries.push({ date: dateStr, role_id: roleId, original_member_id: member.id, current_member_id: member.id });
                    });
                } else {
                    const roleGroups = [
                        [0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11], [12, 13, 14]
                    ];

                    roleGroups.forEach((roleIndices, setIdx) => {
                        const memberSetIdx = currentPerm[setIdx];
                        roleIndices.forEach((roleIdx, i) => {
                            const member = batchMembers[memberSetIdx * 3 + i];
                            newEntries.push({ date: dateStr, role_id: rolesList[roleIdx], original_member_id: member.id, current_member_id: member.id });
                        });
                    });

                    // Backups
                    const nextBatchIdx = (batchIdx + 1) % 4;
                    const nextBatchMembers = members.slice(nextBatchIdx * 15, (nextBatchIdx + 1) * 15);
                    for (let i = 0; i < 3; i++) {
                        const backupMember = nextBatchMembers[i];
                        newEntries.push({ date: dateStr, role_id: rolesList[15 + i], original_member_id: backupMember.id, current_member_id: backupMember.id });
                    }
                }
                dayCount++;
            }
            currentDate = addDays(currentDate, 1);
        }

        if (newEntries.length > 0) {
            await supabase.from('schedule').insert(newEntries);
        }
    },

    async shiftSchedule(startDate: string, reason: string) {
        // 1. Capture current state for undo
        const [{ data: originalSchedule }, { data: originalIcebreakers }] = await Promise.all([
            supabase.from('schedule').select('*').gte('date', startDate),
            supabase.from('daily_icebreaker').select('*').gte('date', startDate)
        ]);

        await supabase.from('schedule_history').insert({
            operation_type: 'shift',
            original_schedule: originalSchedule,
            original_icebreakers: originalIcebreakers,
            holiday_date: startDate
        });

        // 2. Add to holidays
        await supabase.from('holidays').upsert({ date: startDate, reason: reason || "Unexpected Holiday" });

        // 3. Get all unique dates from schedule >= startDate in DESCENDING order
        const { data: scheduleDates } = await supabase.from('schedule').select('date').gte('date', startDate).order('date', { ascending: false });
        const dates = Array.from(new Set(scheduleDates?.map(d => d.date)));

        const { data: holidayData } = await supabase.from('holidays').select('date');
        const holidayDates = holidayData?.map(h => h.date) || [];

        for (const d of dates) {
            let nextDate = addDays(parseISO(d), 1);
            while (isWeekend(nextDate) || holidayDates.includes(format(nextDate, "yyyy-MM-dd"))) {
                nextDate = addDays(nextDate, 1);
            }
            const nextDateStr = format(nextDate, "yyyy-MM-dd");

            await Promise.all([
                supabase.from('schedule').update({ date: nextDateStr }).eq('date', d),
                supabase.from('daily_icebreaker').update({ date: nextDateStr }).eq('date', d)
            ]);
        }
    },

    async undoShift() {
        const { data: lastHistory, error } = await supabase
            .from('schedule_history')
            .select('*')
            .order('id', { ascending: false })
            .limit(1)
            .single();

        if (error || !lastHistory) throw new Error("No history to undo");

        const originalSchedule = lastHistory.original_schedule;
        const originalIcebreakers = lastHistory.original_icebreakers;
        const holidayDate = lastHistory.holiday_date;

        await Promise.all([
            supabase.from('schedule').delete().gte('date', holidayDate),
            supabase.from('daily_icebreaker').delete().gte('date', holidayDate),
            supabase.from('holidays').delete().eq('date', holidayDate)
        ]);

        if (originalSchedule && originalSchedule.length > 0) {
            // Map back to Supabase field names if necessary (they should already match if we saved them correctly)
            await supabase.from('schedule').insert(originalSchedule);
        }

        if (originalIcebreakers && originalIcebreakers.length > 0) {
            await supabase.from('daily_icebreaker').insert(originalIcebreakers);
        }

        await supabase.from('schedule_history').delete().eq('id', lastHistory.id);
    }
};

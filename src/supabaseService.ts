import { supabase } from './supabaseClient';
import { format, parseISO, addDays, endOfMonth } from 'date-fns';
import { ROLES } from './types';

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
        try {
            const [
                schedRes,
                iceRes,
                themeRes
            ] = await Promise.allSettled([
                supabase.from('schedule').select(`
                    *,
                    originalMember:members!original_member_id(name),
                    currentMember:members!current_member_id(name),
                    replacedByMember:members!replaced_by_id(name)
                `).order('date'),
                supabase.from('daily_icebreaker').select('*'),
                supabase.from('daily_theme').select('*')
            ]);

            const scheduleData = (schedRes.status === 'fulfilled' && !schedRes.value.error) ? schedRes.value.data : [];
            const icebreakers = (iceRes.status === 'fulfilled' && !iceRes.value.error) ? iceRes.value.data : [];
            const themes = (themeRes.status === 'fulfilled' && !themeRes.value.error) ? themeRes.value.data : [];

            const allDates = new Set<string>();
            scheduleData?.forEach(s => allDates.add(typeof s.date === 'string' ? s.date.split('T')[0] : s.date));
            icebreakers?.forEach(i => allDates.add(typeof i.date === 'string' ? i.date.split('T')[0] : i.date));
            themes?.forEach(t => allDates.add(typeof t.date === 'string' ? t.date.split('T')[0] : t.date));

            const result: any[] = [];

            allDates.forEach(dateStr => {
                const rolesForDate = scheduleData?.filter(s => (typeof s.date === 'string' ? s.date.split('T')[0] : s.date) === dateStr) || [];
                const ice = icebreakers?.find(i => (typeof i.date === 'string' ? i.date.split('T')[0] : i.date) === dateStr);
                const th = themes?.find(t => (typeof t.date === 'string' ? t.date.split('T')[0] : t.date) === dateStr);

                if (rolesForDate.length > 0) {
                    rolesForDate.forEach(s => {
                        result.push({
                            id: s.id,
                            date: s.date,
                            role_id: s.role_id,
                            roleId: s.role_id,
                            originalMemberId: s.original_member_id,
                            currentMemberId: s.current_member_id,
                            status: s.status,
                            isSubstitution: s.is_substitution,
                            replacedById: s.replaced_by_id,
                            originalMemberName: s.originalMember?.name,
                            currentMemberName: s.currentMember?.name,
                            replacedByName: s.replacedByMember?.name,
                            icebreaker: ice?.game_name,
                            theme: th?.theme
                        });
                    });
                } else {
                    result.push({
                        id: -1,
                        date: dateStr,
                        roleId: 'META',
                        theme: th?.theme,
                        icebreaker: ice?.game_name
                    });
                }
            });

            return result.sort((a, b) => {
                if (a.date !== b.date) return a.date.localeCompare(b.date);
                const indexA = ROLES.findIndex(r => r.id === a.roleId);
                const indexB = ROLES.findIndex(r => r.id === b.roleId);
                return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
            });
        } catch (error) {
            console.error('Fatal error in getSchedule:', error);
            return [];
        }
    },

    async getThemes(): Promise<{ date: string; theme: string }[]> {
        const { data, error } = await supabase.from('daily_theme').select('*');
        if (error) throw error;
        return (data || []).map(t => ({ date: t.date.split('T')[0], theme: t.theme }));
    },

    async getIcebreakers(): Promise<{ date: string; game_name: string }[]> {
        const { data, error } = await supabase.from('daily_icebreaker').select('*');
        if (error) throw error;
        return (data || []).map(i => ({ date: i.date.split('T')[0], game_name: i.game_name }));
    },

    async updateTheme(date: string, theme: string) {
        const { error } = await supabase
            .from('daily_theme')
            .upsert({ date, theme }, { onConflict: 'date' });
        if (error) throw error;
    },

    async updateIcebreaker(date: string, gameName: string) {
        const { error } = await supabase
            .from('daily_icebreaker')
            .upsert({ date, game_name: gameName }, { onConflict: 'date' });
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

    async submitAnnouncement(title: string, content: string, type: 'info' | 'event' | 'warning') {
        const { error } = await supabase
            .from('announcements')
            .insert({ title, content, type, date: new Date().toISOString() });
        if (error) throw error;
    },

    async deleteAnnouncement(id: number) {
        const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', id);
        if (error) throw error;
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

    async getHolidays() {
        const { data, error } = await supabase
            .from('holidays')
            .select('*')
            .order('date');
        if (error) throw error;
        return data;
    },

    async removeHoliday(date: string) {
        const { error: delError } = await supabase
            .from('holidays')
            .delete()
            .eq('date', date);
        if (delError) throw delError;

        const { data: scheduleData } = await supabase
            .from('schedule')
            .select('date')
            .gt('date', date)
            .order('date', { ascending: true });

        const uniqueDates = Array.from(new Set(scheduleData?.map(d => d.date)));
        if (uniqueDates.length === 0) return;

        const { data: holidayData } = await supabase.from('holidays').select('date');
        const holidayDates = holidayData?.map(h => h.date) || [];

        let currentAvailableDate = parseISO(date);
        for (const d of uniqueDates) {
            while (currentAvailableDate.getDay() === 0 || holidayDates.includes(format(currentAvailableDate, "yyyy-MM-dd"))) {
                currentAvailableDate = addDays(currentAvailableDate, 1);
            }
            const targetDateStr = format(currentAvailableDate, "yyyy-MM-dd");
            if (targetDateStr !== d) {
                await Promise.all([
                    supabase.from('schedule').update({ date: targetDateStr }).eq('date', d),
                    supabase.from('daily_icebreaker').update({ date: targetDateStr }).eq('date', d),
                    supabase.from('daily_theme').update({ date: targetDateStr }).eq('date', d)
                ]);
            }
            currentAvailableDate = addDays(currentAvailableDate, 1);
        }
    },

    async addAdhocMeeting(date: string, reason: string) {
        await supabase.from('holidays').delete().eq('date', date);
        const { data: scheduleDates } = await supabase.from('schedule').select('date').gte('date', date).order('date', { ascending: false });
        const dates = Array.from(new Set(scheduleDates?.map(d => d.date)));
        const { data: holidayData } = await supabase.from('holidays').select('date');
        const holidayDates = holidayData?.map(h => h.date) || [];

        for (const d of dates) {
            let nextDate = addDays(parseISO(d), 1);
            while (nextDate.getDay() === 0 || holidayDates.includes(format(nextDate, "yyyy-MM-dd"))) {
                nextDate = addDays(nextDate, 1);
            }
            const nextDateStr = format(nextDate, "yyyy-MM-dd");
            await Promise.all([
                supabase.from('schedule').update({ date: nextDateStr }).eq('date', d),
                supabase.from('daily_icebreaker').update({ date: nextDateStr }).eq('date', d),
                supabase.from('daily_theme').update({ date: nextDateStr }).eq('date', d)
            ]);
        }
        await this.generateSchedule(date);
    },

    async resolveQuery(id: number) {
        const { error } = await supabase
            .from('queries')
            .update({ status: 'resolved' })
            .eq('id', id);
        if (error) throw error;
    },

    async deleteQuery(id: number) {
        const { error } = await supabase
            .from('queries')
            .delete()
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
        const { data: entry, error: entryError } = await supabase
            .from('schedule')
            .select('*')
            .eq('id', scheduleId)
            .single();

        if (entryError || !entry) throw new Error("Entry not found");

        const todayStr = format(new Date(), 'yyyy-MM-dd');
        if (entry.date < todayStr) throw new Error("Cannot modify past attendance");

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

        let availableBackup = null;
        for (const b of backups || []) {
            const { data: currentAssignments } = await supabase
                .from('schedule')
                .select('current_member_id')
                .eq('date', entry.date)
                .neq('status', 'absent');

            const busyMemberIds = new Set(currentAssignments?.map(a => a.current_member_id) || []);
            if (busyMemberIds.has(b.original_member_id)) continue;

            const { data: claimed, error: claimError } = await supabase
                .from('schedule')
                .update({ status: 'absent' })
                .eq('id', b.id)
                .eq('status', 'scheduled')
                .select();

            if (!claimError && claimed && claimed.length > 0) {
                availableBackup = claimed[0];
                break;
            }
        }

        if (availableBackup) {
            const backupMemberId = availableBackup.original_member_id;
            const absenteeMemberId = entry.original_member_id;

            await supabase.from('schedule').update({
                current_member_id: backupMemberId,
                is_substitution: true,
                replaced_by_id: absenteeMemberId,
                status: 'scheduled'
            }).eq('id', scheduleId);

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
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);
        const baseDate = new Date(yearNum, monthNum - 1, 1);
        const start = format(baseDate, 'yyyy-MM-01');
        const end = format(endOfMonth(baseDate), 'yyyy-MM-dd');

        await supabase.from('schedule').delete().gte('date', start).lte('date', end).eq('status', 'scheduled');
        await supabase.from('daily_icebreaker').delete().gte('date', start).lte('date', end);
        await supabase.from('daily_theme').delete().gte('date', start).lte('date', end);
    },

    async generateSchedule(startDate: string, overrideBatch?: { setIdx: number, stepIdx: number }, isSingleDay?: boolean, backupSlotOverride?: number) {
        console.log(`Starting schedule generation from ${startDate}... Override:`, overrideBatch, `SingleDay:`, isSingleDay);
        const { data: members } = await supabase.from('members').select('*').order('attendance_order');
        if (!members || members.length === 0) throw new Error("No members found in database.");

        const { data: holidaysData } = await supabase.from('holidays').select('date');
        const holidays = holidaysData?.map(h => h.date) || [];

        const roleGroups = [
            ["TMOD", "GE", "TTM"],
            ["TIMER", "AH_COUNTER", "GRAMMARIAN"],
            ["SPEAKER_1", "SPEAKER_2", "SPEAKER_3"],
            ["EVALUATOR_1", "EVALUATOR_2", "EVALUATOR_3"],
            ["TT_SPEAKER_1", "TT_SPEAKER_2", "TT_SPEAKER_3"]
        ];

        let currentDate = parseISO(startDate);
        const isStartOfMonth = currentDate.getDate() === 1;
        const daysToGenerate = isSingleDay ? 1 : (isStartOfMonth ? 31 : 12);
        const targetMonth = currentDate.getMonth();

        const newEntries: any[] = [];
        let meetingNumSinceStart = 0;

        // Fetch history since the start of the system to calculate participation counts for rotation
        const { roleHistory, lastParticipationDate } = await this.getMemberHistory('2026-02-11');
        const sessionParticipation: Record<number, number> = {};
        members.forEach(m => {
            sessionParticipation[m.id] = (roleHistory[m.id]?.length || 0);
        });

        // Use actual meeting count to handle batch progression correctly
        const { data: priorMeetings } = await supabase.from('schedule').select('date').lt('date', startDate).not('role_id', 'like', 'BACKUP_%');
        const baseMeetingCount = new Set((priorMeetings || []).map((m: any) => m.date)).size;

        // Backup slot anchor: Cycle 1 (Feb 11 - Apr 7) = Slot 1. From Apr 8 onwards = Slot 2.
        // The slot increments every 4 meetings (one full round through all 4 batches).
        const BACKUP_ANCHOR_DATE = '2026-04-08';
        const BACKUP_ANCHOR_SLOT = 2; // 1-indexed slot at anchor date
        // Count existing meetings in DB from anchor date up to (not including) startDate
        const { data: anchorMeetingsData } = await supabase.from('schedule')
            .select('date').gte('date', BACKUP_ANCHOR_DATE).lt('date', startDate).not('role_id', 'like', 'BACKUP_%');
        const baseMeetingsSinceAnchor = new Set((anchorMeetingsData || []).map((m: any) => m.date)).size;
        let meetingsSinceAnchorInThisRun = 0; // counts meetings >= anchor date processed in this generation run

        for (let i = 0; i < daysToGenerate; i++) {
            if (!isSingleDay && isStartOfMonth && currentDate.getMonth() !== targetMonth) break;
            const dateStr = format(currentDate, "yyyy-MM-dd");
            if (currentDate.getDay() === 0 || holidays.includes(dateStr)) {
                currentDate = addDays(currentDate, 1);
                // If it's a single day and we hit a holiday/Sunday, we might want to skip generation,
                // but the old logic just skipped the loop. So if isSingleDay is true, it shouldn't just skip and generate nothing.
                // For a single day override, the frontend ensures it's a valid date, but just in case:
                if (isSingleDay) {
                    throw new Error(`Cannot schedule on ${dateStr} (Sunday or Holiday).`);
                }
                continue;
            }

            console.log(`--- Processing date: ${dateStr} (Meeting #${baseMeetingCount + meetingNumSinceStart + 1}) ---`);
            // Clear any existing draft entries
            await supabase.from('schedule').delete().eq('date', dateStr).eq('status', 'scheduled');

            const currentMeetingIndex = baseMeetingCount + meetingNumSinceStart;
            let selectedTriadIds: number[][] = Array(5).fill(null);

            if (overrideBatch) {
                const effectiveCount = (overrideBatch.stepIdx * 4) + overrideBatch.setIdx + meetingNumSinceStart;
                const setIdx = effectiveCount % 4;
                const stepIdx = Math.floor(effectiveCount / 4) % 5;
                const triadRotationMappings = [[1, 2, 3, 4, 5], [5, 4, 1, 3, 2], [2, 1, 4, 5, 3], [4, 5, 2, 1, 3], [3, 4, 5, 2, 1]];
                const mapping = triadRotationMappings[stepIdx];
                
                console.log(`Using Batch: Set ${setIdx + 1}, Step ${stepIdx + 1} (Mapping: ${mapping})`);

                for (let tIdx = 0; tIdx < 5; tIdx++) {
                    const destinationGroupIdx = mapping[tIdx] - 1;
                    const triadIds = [
                        members[setIdx * 15 + tIdx * 3]?.id,
                        members[setIdx * 15 + tIdx * 3 + 1]?.id,
                        members[setIdx * 15 + tIdx * 3 + 2]?.id
                    ].filter(id => id !== undefined);
                    
                    if (triadIds.length === 3) {
                        selectedTriadIds[destinationGroupIdx] = triadIds;
                    }
                }
            } else {
                // Fallback to pool-based selection if no batch is specified
                const sortedPool = [...members].sort((a, b) => {
                    const countA = sessionParticipation[a.id] || 0;
                    const countB = sessionParticipation[b.id] || 0;
                    if (countA !== countB) return countA - countB;
                    return (lastParticipationDate[a.id] || "").localeCompare(lastParticipationDate[b.id] || "");
                });

                const selectedMembers = sortedPool.slice(0, 15);
                for (let gIdx = 0; gIdx < 5; gIdx++) {
                    // FIX: Shift the triads through the role groups based on meeting index to ensure they cycle
                    const destinationGroupIdx = (currentMeetingIndex + gIdx) % 5;
                    selectedTriadIds[destinationGroupIdx] = selectedMembers.slice(gIdx * 3, gIdx * 3 + 3).map(m => m.id);
                }
            }

            // Assign roles within each triad based on participation count (1->2->3 rotation)
            selectedTriadIds.forEach((triadIds, gIdx) => {
                if (!triadIds || triadIds.length === 0) return;
                const groupRoles = roleGroups[gIdx];
                const rolesTaken = new Set<number>();
                
                // Sort by ID to ensure deterministic assignment if multiple members have same history
                const pickingOrder = [...triadIds].sort((a, b) => a - b);

                pickingOrder.forEach(mId => {
                    let roleIdx = (sessionParticipation[mId] || 0) % 3;
                    // Resolve collisions within the same triad (should not happen if everyone increments correctly)
                    while (rolesTaken.has(roleIdx)) {
                        roleIdx = (roleIdx + 1) % 3;
                    }
                    rolesTaken.add(roleIdx);
                    
                    newEntries.push({
                        date: dateStr,
                        role_id: groupRoles[roleIdx],
                        original_member_id: mId,
                        current_member_id: mId,
                        status: 'scheduled'
                    });

                    // Update memory state for this loop so subsequent meeting rotations work
                    sessionParticipation[mId]++;
                    lastParticipationDate[mId] = dateStr;
                    const mName = members.find(m => m.id === mId)?.name;
                    console.log(`  Assigned ${mName} to ${groupRoles[roleIdx]} (Participation: ${sessionParticipation[mId] - 1} -> ${sessionParticipation[mId]})`);
                });
            });

            // Handle Backups
            const assignedIds = new Set(newEntries.filter(e => e.date === dateStr).map(e => e.original_member_id));
            
            if (overrideBatch) {
                // If using explicit batches, strictly pull backups from the next batch
                const effectiveCount = (overrideBatch.stepIdx * 4) + overrideBatch.setIdx + meetingNumSinceStart;
                const setIdx = effectiveCount % 4;
                const nextBatchStart = ((setIdx + 1) % 4) * 15;

                // BACKUP SLOT LOGIC:
                // Anchor: Apr 8, 2026 = Slot 2. Slot advances every 4 meetings (1 full batch cycle).
                // If admin overrides slot manually, use that directly.
                let cycleNumber: number;
                if (backupSlotOverride !== undefined) {
                    // Manual: Starts from the selected slot and rotates every 4 meetings in this run
                    cycleNumber = (backupSlotOverride - 1) + Math.floor(meetingNumSinceStart / 4);
                } else if (dateStr >= BACKUP_ANCHOR_DATE) {
                    // Auto: count meetings since anchor, divide by 4 to get completed cycles
                    const totalMeetingsSinceAnchor = baseMeetingsSinceAnchor + meetingsSinceAnchorInThisRun;
                    const extraCycles = Math.floor(totalMeetingsSinceAnchor / 4);
                    cycleNumber = (BACKUP_ANCHOR_SLOT - 1) + extraCycles;
                } else {
                    cycleNumber = 0; // Before Apr 8 anchor = Slot 1
                }

                const backupStartOffset = (cycleNumber % 5) * 3;
                console.log(`  Backup: date=${dateStr}, meetings since anchor=${baseMeetingsSinceAnchor + meetingsSinceAnchorInThisRun}, slot=${cycleNumber + 1}, offset=${backupStartOffset} (members ${backupStartOffset + 1}-${backupStartOffset + 3} of next batch)`);

                let bIdx = 0, offset = backupStartOffset;
                while (bIdx < 3 && offset < 15) {
                    const backupMember = members[nextBatchStart + offset];
                    if (backupMember && !assignedIds.has(backupMember.id)) {
                        newEntries.push({
                            date: dateStr,
                            role_id: `BACKUP_${bIdx + 1}`,
                            original_member_id: backupMember.id,
                            current_member_id: backupMember.id,
                            status: 'scheduled'
                        });
                        bIdx++;
                    }
                    offset++;
                }
            } else {
                // Fallback to pool-based backups
                const backupCandidates = members
                    .filter(m => !assignedIds.has(m.id))
                    .sort((a, b) => (sessionParticipation[a.id] || 0) - (sessionParticipation[b.id] || 0));
                
                backupCandidates.slice(0, 3).forEach((b, bIdx) => {
                    newEntries.push({
                        date: dateStr,
                        role_id: `BACKUP_${bIdx + 1}`,
                        original_member_id: b.id,
                        current_member_id: b.id,
                        status: 'scheduled'
                    });
                });
            }

            // Track meetings since anchor for next iteration's backup slot calculation
            if (dateStr >= BACKUP_ANCHOR_DATE) meetingsSinceAnchorInThisRun++;

            meetingNumSinceStart++;
            currentDate = addDays(currentDate, 1);
        }

        if (newEntries.length > 0) {
            try {
                console.log(`Finalizing schedule: Inserting ${newEntries.length} entries...`);
                const { error } = await supabase.from('schedule').insert(newEntries);
                if (error) {
                    console.error('DATABASE ERROR during insertion:', error);
                    throw new Error(`Schedule Insertion Failed: ${error.message}`);
                }
                console.log('SUCCESS: Schedule generation completed and saved.');
            } catch (err: any) {
                console.error('FATAL ERROR in generateSchedule:', err);
                throw err;
            }
        }
    },

    async generateMonthSchedule(month: string, year: string, holidayDates: string[], overrideBatch?: { setIdx: number, stepIdx: number }, backupSlotOverride?: number) {
        const startDateString = `${year}-${month.padStart(2, '0')}-01`;
        const lastDateInMonth = format(endOfMonth(parseISO(startDateString)), 'yyyy-MM-dd');
        
        console.log(`Generating schedule for ${month}/${year}. Cleaning up existing scheduled entries...`);
        await supabase.from('schedule')
            .delete()
            .gte('date', startDateString)
            .lte('date', lastDateInMonth)
            .eq('status', 'scheduled');

        if (holidayDates.length > 0) {
            const holidayRows = holidayDates.map(date => ({ date, reason: 'Holiday' }));
            await supabase.from('holidays').upsert(holidayRows, { onConflict: 'date' });
        }
        await this.generateSchedule(startDateString, overrideBatch, false, backupSlotOverride);
    },

    async shiftSchedule(startDate: string, reason: string) {
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
        await supabase.from('holidays').upsert({ date: startDate, reason: reason || "Unexpected Holiday" });
        const { data: scheduleDates } = await supabase.from('schedule').select('date').gte('date', startDate).order('date', { ascending: false });
        const dates = Array.from(new Set(scheduleDates?.map(d => d.date)));
        const { data: holidayData } = await supabase.from('holidays').select('date');
        const holidayDates = holidayData?.map(h => h.date) || [];

        for (const d of dates) {
            let nextDate = addDays(parseISO(d), 1);
            while (nextDate.getDay() === 0 || holidayDates.includes(format(nextDate, "yyyy-MM-dd"))) {
                nextDate = addDays(nextDate, 1);
            }
            const nextDateStr = format(nextDate, "yyyy-MM-dd");
            await Promise.all([
                supabase.from('schedule').update({ date: nextDateStr }).eq('date', d),
                supabase.from('daily_icebreaker').update({ date: nextDateStr }).eq('date', d)
            ]);
        }
    },

    async rescheduleMeeting(sourceDate: string, targetDate: string) {
        if (targetDate < sourceDate) {
            const { data: holidaysInRange } = await supabase.from('holidays').select('date').gte('date', targetDate).lt('date', sourceDate);
            if (holidaysInRange && holidaysInRange.length > 0) await this.removeHoliday(targetDate);
        } else if (targetDate > sourceDate) {
            await this.shiftSchedule(sourceDate, "Rescheduled");
        }
    },

    async undoShift() {
        const { data: lastHistory, error } = await supabase.from('schedule_history').select('*').order('id', { ascending: false }).limit(1).single();
        if (error || !lastHistory) throw new Error("No history to undo");
        const holidayDate = lastHistory.holiday_date;
        await Promise.all([
            supabase.from('schedule').delete().gte('date', holidayDate),
            supabase.from('daily_icebreaker').delete().gte('date', holidayDate),
            supabase.from('holidays').delete().eq('date', holidayDate)
        ]);
        if (lastHistory.original_schedule) await supabase.from('schedule').insert(lastHistory.original_schedule);
        if (lastHistory.original_icebreakers) await supabase.from('daily_icebreaker').insert(lastHistory.original_icebreakers);
        await supabase.from('schedule_history').delete().eq('id', lastHistory.id);
    },

    async deleteAllSchedule() {
        await supabase.from('schedule').delete().neq('id', 0);
    },

    async generateDateWithOverride(dateStr: string, setIdx: number, stepIdx: number, manualRoster?: Record<string, number>, shiftSubsequent?: boolean, backupSlotOverride?: number) {
        if (manualRoster) {
            const { data: members } = await supabase.from('members').select('*').order('attendance_order');
            if (!members || members.length === 0) throw new Error('No members found');
            await supabase.from('schedule').delete().eq('date', dateStr).eq('status', 'scheduled');
            const newEntries: any[] = [];
            Object.entries(manualRoster).forEach(([roleId, memberId]) => {
                newEntries.push({ date: dateStr, role_id: roleId, original_member_id: memberId, current_member_id: memberId, status: 'scheduled' });
            });
            if (newEntries.length > 0) await supabase.from('schedule').insert(newEntries);
        } else {
            // Cleanly delegate to the unified, history-based generation logic
            await this.generateSchedule(dateStr, { setIdx, stepIdx }, true, backupSlotOverride);
        }

        if (shiftSubsequent) {
            await supabase.from('schedule').delete().gt('date', dateStr).eq('status', 'scheduled');
            let nextDate = addDays(parseISO(dateStr), 1);
            const { data: hData } = await supabase.from('holidays').select('date');
            const hList = hData?.map(h => h.date) || [];
            while (nextDate.getDay() === 0 || hList.includes(format(nextDate, 'yyyy-MM-dd'))) nextDate = addDays(nextDate, 1);
            await this.generateSchedule(format(nextDate, 'yyyy-MM-dd'), { setIdx: (setIdx + 1) % 4, stepIdx: (setIdx === 3) ? (stepIdx + 1) % 5 : stepIdx }, false, backupSlotOverride);
        }
    },

    async getMemberHistory(sinceDate: string) {
        const { data: scheduleData, error } = await supabase.from('schedule').select('date, role_id, original_member_id').gte('date', sinceDate).not('role_id', 'like', 'BACKUP_%');
        if (error) throw error;
        const roleHistory: Record<number, string[]> = {};
        const triadHistory: Record<number, Set<number>> = {};
        const lastParticipationDate: Record<number, string> = {};
        const byDate: Record<string, any[]> = {};
        scheduleData?.forEach(row => {
            const dateStr = typeof row.date === 'string' ? row.date.split('T')[0] : row.date;
            if (!byDate[dateStr]) byDate[dateStr] = [];
            byDate[dateStr].push(row);
            if (!roleHistory[row.original_member_id]) roleHistory[row.original_member_id] = [];
            roleHistory[row.original_member_id].push(row.role_id);
            if (!lastParticipationDate[row.original_member_id] || dateStr > lastParticipationDate[row.original_member_id]) {
                lastParticipationDate[row.original_member_id] = dateStr;
            }
        });
        const roleGroups = [["TMOD", "GE", "TTM"], ["TIMER", "AH_COUNTER", "GRAMMARIAN"], ["SPEAKER_1", "SPEAKER_2", "SPEAKER_3"], ["EVALUATOR_1", "EVALUATOR_2", "EVALUATOR_3"], ["TT_SPEAKER_1", "TT_SPEAKER_2", "TT_SPEAKER_3"]];
        Object.values(byDate).forEach(dayRoles => {
            roleGroups.forEach(group => {
                const groupMembers = dayRoles.filter(r => group.includes(r.role_id)).map(r => r.original_member_id);
                if (groupMembers.length === 3) {
                    groupMembers.forEach(m1 => {
                        if (!triadHistory[m1]) triadHistory[m1] = new Set();
                        groupMembers.forEach(m2 => { if (m1 !== m2) triadHistory[m1].add(m2); });
                    });
                }
            });
        });
        return { roleHistory, triadHistory, lastParticipationDate };
    },

    async syncMembers() {
        const membersList = [
            { rollNo: "25UEC002", name: "NAVANEETHA KRISHNAN.R" }, { rollNo: "25UEC004", name: "ALLEN VICTOR.A" }, { rollNo: "25UEC006", name: "HARSHITHAA SHREE.R" }, { rollNo: "25UEC008", name: "KARTHICK PANDIYAN.M" }, { rollNo: "25UEC010", name: "KABILVISHWA.TM" }, { rollNo: "25UEC012", name: "HARI PRASATH.G" }, { rollNo: "25UEC014", name: "SHARMILA.J" }, { rollNo: "25UEC016", name: "HEMA VARSHINI.A" }, { rollNo: "25UEC018", name: "HARSHINI.S" }, { rollNo: "25UEC020", name: "KARTHIKEYAN.P" }, { rollNo: "25UEC022", name: "DHARUNYASRI.G" }, { rollNo: "25UEC023", name: "HIBSA FARITH.S.H" }, { rollNo: "25UEC024", name: "DHAKSHANA.K" }, { rollNo: "25UEC026", name: "ABISHEK.S" }, { rollNo: "25UEC028", name: "HARSHINI.S.D" }, { rollNo: "25UEC030", name: "HARI CHARAN.S.P" }, { rollNo: "25UEC032", name: "SAKTHI DIVASHKAR.M" }, { rollNo: "25UEC036", name: "HARISH KARTHI.R" }, { rollNo: "25UEC038", name: "BALAJI.N" }, { rollNo: "25UEC040", name: "NITESH VARMAN.M" }, { rollNo: "25UEC042", name: "MAHENDRAN.N.P" }, { rollNo: "25UEC044", name: "VENKATAPRIYA.S" }, { rollNo: "25UEC046", name: "YUVASRI.K" }, { rollNo: "25UEC048", name: "SUJITHA.J.T" }, { rollNo: "25UEC050", name: "PATHMASINDHUJA.K" }, { rollNo: "25UEC051", name: "LAKSHMI.L" }, { rollNo: "25UEC052", name: "BOOPESH.K.V" }, { rollNo: "25UEC054", name: "SENTHAMILSELVI.M" }, { rollNo: "25UEC056", name: "KHAN MOHAMED.S" }, { rollNo: "25UEC057", name: "SWETHA ROSE.S" }, { rollNo: "25UEC058", name: "VIMAL.V.S" }, { rollNo: "25UEC059", name: "RAHUL.P" }, { rollNo: "25UEC062", name: "MOHAMED YUNUS.R" }, { rollNo: "25UEC064", name: "PRIYADHARSHINI.K" }, { rollNo: "25UEC066", name: "HARIHARAN.S" }, { rollNo: "25UEC067", name: "YATHEESHWAR.B.R" }, { rollNo: "25UEC068", name: "LATHIKA.S" }, { rollNo: "25UEC069", name: "DEVIPRIYA.T" }, { rollNo: "25UEC074", name: "SANTHOSHKANNA.S" }, { rollNo: "25UEC075", name: "ABINESH MILTON.T" }, { rollNo: "25UEC076", name: "DIVYESH SANKAR.N.K" }, { rollNo: "25UEC082", name: "GOKUL.S" }, { rollNo: "25UEC083", name: "YOGAHARANI.A" }, { rollNo: "25UEC085", name: "MAGATHI.M" }, { rollNo: "25UEC086", name: "SHRUTI.K" }, { rollNo: "25UEC089", name: "MATTHEW PAULS.A" }, { rollNo: "25UEC092", name: "GURU VIGNESHWARAN.S" }, { rollNo: "25UEC096", name: "BIRUNTHA.J" }, { rollNo: "25UEC102", name: "MAHALAKSHMI.G" }, { rollNo: "25UEC103", name: "UMA MAHESWARI.M" }, { rollNo: "25UEC107", name: "YOGESH.K" }, { rollNo: "25UEC108", name: "GAUTHAM.S" }, { rollNo: "25UEC109", name: "SRIMATHI.B" }, { rollNo: "25UEC110", name: "PRINCE VICTOR.A" }, { rollNo: "25UEC111", name: "PRATHIKSHA.M.P" }, { rollNo: "25UEC113", name: "DINESHPANDI.R" }, { rollNo: "25UEC115", name: "YAZHINI.M" }, { rollNo: "25UEC116", name: "HARSHVARDHAN.S" }, { rollNo: "25UEC117", name: "MOHAMMED SALMANKHAN.N" }, { rollNo: "25UEC120", name: "DEEPIKA SRI.R.K" }
        ];
        const mEntries = membersList.map((m, i) => ({ roll_no: m.rollNo, name: m.name, attendance_order: i + 1, photo_url: `https://picsum.photos/seed/${m.rollNo}/200/200` }));
        const hEntries = [{ date: '2026-02-14', reason: 'Weekend' }, { date: '2026-02-15', reason: 'Weekend' }, { date: '2026-02-22', reason: 'Weekend' }, { date: '2026-02-23', reason: 'Holiday' }, { date: '2026-02-28', reason: 'Weekend' }, { date: '2026-03-01', reason: 'Sunday' }, { date: '2026-03-07', reason: 'Annual Day' }, { date: '2026-03-08', reason: 'Hostel Day' }, { date: '2026-03-12', reason: 'Cycle Test I' }, { date: '2026-03-13', reason: 'Cycle Test I' }, { date: '2026-03-14', reason: 'Cycle Test I' }, { date: '2026-03-15', reason: 'Sunday' }, { date: '2026-03-16', reason: 'Cycle Test I' }, { date: '2026-03-17', reason: 'Cycle Test I' }, { date: '2026-03-18', reason: 'Cycle Test I' }, { date: '2026-03-19', reason: 'Telugu New Year' }, { date: '2026-03-20', reason: 'Additional Holiday' }, { date: '2026-03-21', reason: 'Ramzan' }, { date: '2026-03-22', reason: 'Sunday' }, { date: '2026-03-28', reason: "Funtura' 26" }, { date: '2026-03-29', reason: 'Sunday' }, { date: '2026-04-02', reason: 'PTM' }, { date: '2026-04-03', reason: 'Good Friday' }, { date: '2026-04-04', reason: 'Holiday' }, { date: '2026-04-05', reason: 'Sunday' }, { date: '2026-04-06', reason: 'Pongal' }, { date: '2026-04-07', reason: 'Pongal' }, { date: '2026-04-11', reason: 'Sustainathon' }, { date: '2026-04-12', reason: 'Sunday' }, { date: '2026-04-14', reason: 'Tamil New Year' }, { date: '2026-04-18', reason: 'Ethnic Day' }, { date: '2026-04-19', reason: 'Sunday' }, { date: '2026-04-25', reason: 'Seminar Day' }, { date: '2026-04-26', reason: 'Sunday' }, { date: '2026-04-27', reason: 'Feedback Day' }, { date: '2026-04-30', reason: 'Model Practical' }];
        await Promise.all([supabase.from('members').upsert(mEntries, { onConflict: 'roll_no' }), supabase.from('holidays').upsert(hEntries, { onConflict: 'date' })]);
    }
};
